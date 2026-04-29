import io, csv, math
from flask import Blueprint, request, jsonify, send_file, Response
from flask_jwt_extended import verify_jwt_in_request
from datetime import datetime, timedelta
from models.database import Prediction
from collections import Counter

export_bp = Blueprint('export', __name__)

def _auth_from_query_or_header():
    try:
        verify_jwt_in_request()
        return True
    except Exception:
        pass
    token = request.args.get('token')
    if not token:
        return False
    try:
        request.headers.environ['HTTP_AUTHORIZATION'] = f'Bearer {token}'
        verify_jwt_in_request()
        return True
    except Exception:
        return False

@export_bp.route('/report', methods=['GET'])
def export_report():
    if not _auth_from_query_or_header():
        return jsonify({'error': 'Authorization required'}), 401
    fmt = request.args.get('format', 'csv').lower()
    batch_id = request.args.get('batch_id')
    mode = request.args.get('mode', '').lower()
    query = Prediction.query
    if batch_id:
        query = query.filter(Prediction.batch_id == batch_id)
    if mode == 'last24h':
        query = query.filter(Prediction.timestamp >= datetime.utcnow() - timedelta(hours=24))
    else:
        if request.args.get('from'):
            query = query.filter(Prediction.timestamp >= request.args.get('from'))
        if request.args.get('to'):
            query = query.filter(Prediction.timestamp <= request.args.get('to'))
    predictions = query.order_by(Prediction.timestamp.desc()).limit(10000).all()
    if not predictions:
        return jsonify({'error': 'No predictions found'}), 404
    if fmt == 'csv':
        return _csv(predictions, batch_id, mode)
    elif fmt == 'pdf':
        return _pdf(predictions, batch_id, mode)
    return jsonify({'error': 'format must be csv or pdf'}), 400

def _csv(preds, bid, mode):
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(['ID','Timestamp','Src IP','Dst IP','Protocol','Prediction','Confidence','Model','Review'])
    for p in preds:
        w.writerow([p.id, p.timestamp.isoformat(), p.src_ip or '', p.dst_ip or '',
                     p.protocol or '', p.prediction, round(p.confidence*100,2), p.model_used,
                     'Yes' if p.needs_review else 'No'])
    out.seek(0)
    label = 'last24h' if mode == 'last24h' else (bid[:8] if bid else 'all')
    return Response(out.getvalue(), mimetype='text/csv',
                    headers={'Content-Disposition': f'attachment; filename=ids_{label}_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.csv'})

def _pdf(preds, bid, mode):
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import mm, cm
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER
        from reportlab.graphics.shapes import Drawing, Rect, String, Wedge, Circle

        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=1.5*cm, bottomMargin=1.5*cm, leftMargin=2*cm, rightMargin=2*cm)
        ss = getSampleStyleSheet()
        el = []

        DK = colors.HexColor('#0f172a'); BL = colors.HexColor('#3b82f6'); RD = colors.HexColor('#ef4444')
        GN = colors.HexColor('#10b981'); OR = colors.HexColor('#f59e0b'); PU = colors.HexColor('#8b5cf6')
        GY = colors.HexColor('#64748b'); LT = colors.HexColor('#f1f5f9'); CY = colors.HexColor('#06b6d4')
        YL = colors.HexColor('#fbbf24')

        sec = ParagraphStyle('S', parent=ss['Heading2'], fontSize=13, textColor=DK, spaceBefore=8*mm, spaceAfter=4*mm, fontName='Helvetica-Bold')
        bod = ParagraphStyle('B', parent=ss['Normal'], fontSize=9, textColor=DK, leading=14)
        sml = ParagraphStyle('Sm', parent=ss['Normal'], fontSize=7, textColor=GY, alignment=TA_CENTER)
        mvl = ParagraphStyle('MV', parent=ss['Normal'], fontSize=16, textColor=DK, alignment=TA_CENTER, fontName='Helvetica-Bold')

        # Stats
        tot = len(preds); atk = sum(1 for p in preds if p.prediction=='Attack'); ben = tot - atk
        rev = sum(1 for p in preds if p.needs_review)
        rt = round(atk/max(tot,1)*100,1)
        ap = [p for p in preds if p.prediction=='Attack']
        ac = round(sum(p.confidence for p in preds)/max(tot,1)*100,1)
        hi = sum(1 for p in ap if p.confidence>=0.90)
        md = sum(1 for p in ap if 0.70<=p.confidence<0.90)
        lo = sum(1 for p in ap if p.confidence<0.70)
        ips = Counter(p.src_ip for p in ap if p.src_ip).most_common(8)
        pm = {6:'TCP',17:'UDP',1:'ICMP'}
        pr = Counter(pm.get(p.protocol,'Other') for p in preds if p.protocol is not None)
        ml = Counter(p.model_used for p in preds)
        ts = [p.timestamp for p in preds if p.timestamp]
        tf = min(ts).strftime('%Y-%m-%d %H:%M') if ts else 'N/A'
        tt = max(ts).strftime('%Y-%m-%d %H:%M') if ts else 'N/A'

        def donut(w, h, cx, cy, r, ir, slices, ctxt='', csub=''):
            d = Drawing(w, h)
            st = 90
            for pct, col, lb in slices:
                if pct <= 0: continue
                ang = pct/100*360
                d.add(Wedge(cx, cy, r, st, st-ang, fillColor=col, strokeColor=colors.white, strokeWidth=2))
                st -= ang
            d.add(Circle(cx, cy, ir, fillColor=colors.white, strokeColor=None))
            if ctxt:
                d.add(String(cx, cy+4, ctxt, fontSize=14, fillColor=DK, fontName='Helvetica-Bold', textAnchor='middle'))
            if csub:
                d.add(String(cx, cy-10, csub, fontSize=7, fillColor=GY, fontName='Helvetica', textAnchor='middle'))
            lx = cx - r; ly = cy - r - 15
            for pct, col, lb in slices:
                if pct <= 0: continue
                d.add(Rect(lx, ly, 8, 8, fillColor=col, strokeColor=None))
                d.add(String(lx+12, ly+1, f'{lb} ({pct:.0f}%)', fontSize=7, fillColor=DK, fontName='Helvetica'))
                lx += 80
            return d

        # Banner
        bn = Drawing(480, 65)
        bn.add(Rect(0, 0, 480, 65, fillColor=DK, strokeColor=None, rx=8, ry=8))
        bn.add(Rect(0, 0, 6, 65, fillColor=BL, strokeColor=None))
        bn.add(String(20, 42, 'IDS/IPS SECURITY REPORT', fontSize=20, fillColor=colors.white, fontName='Helvetica-Bold'))
        rtp = 'Last 24 Hours' if mode=='last24h' else ('Batch Analysis' if bid else 'Full Report')
        bn.add(String(20, 22, rtp, fontSize=10, fillColor=BL, fontName='Helvetica'))
        bn.add(String(20, 8, f'{tf}  to  {tt}', fontSize=8, fillColor=GY, fontName='Helvetica'))
        bn.add(String(400, 42, datetime.utcnow().strftime('%Y-%m-%d'), fontSize=11, fillColor=colors.white, fontName='Helvetica-Bold'))
        bn.add(String(400, 26, datetime.utcnow().strftime('%H:%M UTC'), fontSize=9, fillColor=GY, fontName='Helvetica'))
        el.append(bn); el.append(Spacer(1,6*mm))

        # Summary
        el.append(Paragraph('EXECUTIVE SUMMARY', sec))
        el.append(Paragraph(f'Analyzed <b>{tot:,}</b> flows from <b>{tf}</b> to <b>{tt}</b>. '
            f'Detected <b>{atk:,}</b> attacks ({rt}% rate), avg confidence <b>{ac}%</b>. '
            f'<b>{rev:,}</b> require manual review.', bod))
        el.append(Spacer(1,4*mm))

        # Metrics
        el.append(Paragraph('KEY METRICS', sec))
        vs = [(f'{tot:,}','Total',DK),(f'{atk:,}','Attacks',RD),(f'{ben:,}','Benign',GN),
              (f'{rt}%','Attack Rate',OR),(f'{ac}%','Avg Conf',BL),(f'{rev:,}','Review',PU)]
        r1=[Paragraph(f'<font color="{c.hexval()}">{v}</font>',mvl) for v,l,c in vs]
        r2=[Paragraph(l,sml) for v,l,c in vs]
        mt=Table([r1,r2],colWidths=[80]*6)
        mt.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),LT),('BOX',(0,0),(-1,-1),0.5,colors.HexColor('#e2e8f0')),
            ('INNERGRID',(0,0),(-1,-1),0.25,colors.HexColor('#e2e8f0')),('VALIGN',(0,0),(-1,-1),'MIDDLE'),
            ('TOPPADDING',(0,0),(-1,0),10),('BOTTOMPADDING',(0,-1),(-1,-1),10)]))
        el.append(mt); el.append(Spacer(1,6*mm))

        # 3 Donut Charts
        el.append(Paragraph('VISUAL ANALYSIS', sec))
        ap2=round(atk/max(tot,1)*100,1); bp2=round(100-ap2,1)
        d1=donut(160,140,80,80,50,30,[(ap2,RD,'Attack'),(bp2,GN,'Benign')],f'{ap2}%','Attack Rate')
        hp=round(hi/max(atk,1)*100,1); mp=round(md/max(atk,1)*100,1); lp=round(lo/max(atk,1)*100,1)
        d2=donut(160,140,80,80,50,30,[(hp,RD,'High'),(mp,OR,'Medium'),(lp,YL,'Low')],str(atk),'Severity')
        ptot=sum(pr.values()) or 1
        pc=[BL,CY,PU,GY]
        ps=[(round(c/ptot*100,1),pc[i%len(pc)],n) for i,(n,c) in enumerate(pr.most_common())]
        d3=donut(160,140,80,80,50,30,ps,str(ptot),'Protocols')
        ct=Table([[d1,d2,d3]],colWidths=[160,160,160])
        ct.setStyle(TableStyle([('ALIGN',(0,0),(-1,-1),'CENTER'),('VALIGN',(0,0),(-1,-1),'TOP')]))
        el.append(ct); el.append(Spacer(1,6*mm))

        # IP Bar Chart
        if ips:
            el.append(Paragraph('TOP ATTACKING IPs', sec))
            mx_c=ips[0][1]
            bd=Drawing(480,20*len(ips)+10)
            for i,(ip,cnt) in enumerate(ips):
                y=(len(ips)-1-i)*20+5; bw=max(4,int(300*cnt/mx_c))
                pct=round(cnt/max(atk,1)*100,1)
                gc=RD if pct>20 else (OR if pct>10 else BL)
                bd.add(Rect(100,y,300,14,fillColor=LT,strokeColor=None,rx=3,ry=3))
                bd.add(Rect(100,y,bw,14,fillColor=gc,strokeColor=None,rx=3,ry=3))
                bd.add(String(5,y+3,ip,fontSize=7,fillColor=DK,fontName='Helvetica'))
                bd.add(String(410,y+3,f'{cnt} ({pct}%)',fontSize=7,fillColor=GY,fontName='Helvetica'))
            el.append(bd); el.append(Spacer(1,6*mm))

        # Confidence bars
        el.append(Paragraph('CONFIDENCE DISTRIBUTION', sec))
        cr=[('>90%',sum(1 for p in preds if p.confidence>=0.90),GN),
            ('70-90%',sum(1 for p in preds if 0.70<=p.confidence<0.90),BL),
            ('50-70%',sum(1 for p in preds if 0.50<=p.confidence<0.70),OR),
            ('<50%',sum(1 for p in preds if p.confidence<0.50),YL)]
        cd=Drawing(480,50)
        cd.add(Rect(0,20,480,20,fillColor=LT,strokeColor=None,rx=4,ry=4))
        x=0
        for lb,cn,co in cr:
            w=max(1,int(480*cn/max(tot,1)))
            if w>2: cd.add(Rect(x,20,w,20,fillColor=co,strokeColor=None))
            x+=w
        lx=0
        for lb,cn,co in cr:
            cd.add(Rect(lx,2,8,8,fillColor=co,strokeColor=None))
            cd.add(String(lx+12,3,f'{lb}: {cn} ({round(cn/max(tot,1)*100,1)}%)',fontSize=7,fillColor=DK,fontName='Helvetica'))
            lx+=120
        el.append(cd); el.append(Spacer(1,6*mm))

        # Severity + Model tables
        el.append(Paragraph('SEVERITY & MODEL BREAKDOWN', sec))
        sd=[['Severity','Count','%'],['HIGH',str(hi),f'{round(hi/max(atk,1)*100,1)}%'],
            ['MEDIUM',str(md),f'{round(md/max(atk,1)*100,1)}%'],['LOW',str(lo),f'{round(lo/max(atk,1)*100,1)}%']]
        stb=Table(sd,colWidths=[80,60,60])
        stb.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),DK),('TEXTCOLOR',(0,0),(-1,0),colors.white),
            ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),9),('ALIGN',(0,0),(-1,-1),'CENTER'),
            ('GRID',(0,0),(-1,-1),0.25,colors.HexColor('#cbd5e1')),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,LT]),
            ('TEXTCOLOR',(0,1),(0,1),RD),('TEXTCOLOR',(0,2),(0,2),OR),('FONTNAME',(0,1),(0,-1),'Helvetica-Bold'),
            ('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5)]))
        mdd=[['Model','Count']]+[[m,str(c)] for m,c in ml.most_common()]
        mtb=Table(mdd,colWidths=[120,80])
        mtb.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),GN),('TEXTCOLOR',(0,0),(-1,0),colors.white),
            ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),9),('ALIGN',(0,0),(-1,-1),'CENTER'),
            ('GRID',(0,0),(-1,-1),0.25,colors.HexColor('#cbd5e1')),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,LT]),
            ('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5)]))
        sb=Table([[stb,Spacer(20,0),mtb]])
        sb.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP')]))
        el.append(sb); el.append(Spacer(1,6*mm))

        el.append(HRFlowable(width='100%',thickness=1,color=colors.HexColor('#e2e8f0')))
        el.append(Spacer(1,4*mm))

        # Detail table
        mx=200
        el.append(Paragraph(f'DETAILED PREDICTIONS ({min(tot,mx)} of {tot:,})', sec))
        dt=[['#','Time','Src IP','Dst IP','Pred','Conf','Rev']]
        for p in preds[:mx]:
            dt.append([str(p.id),p.timestamp.strftime('%m/%d %H:%M'),p.src_ip or '-',p.dst_ip or '-',
                       p.prediction,f'{round(p.confidence*100,1)}%','Yes' if p.needs_review else 'No'])
        tb=Table(dt,colWidths=[40,70,95,95,55,50,40],repeatRows=1)
        tsl=[('BACKGROUND',(0,0),(-1,0),DK),('TEXTCOLOR',(0,0),(-1,0),colors.white),
             ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),7),
             ('ALIGN',(0,0),(-1,-1),'CENTER'),('GRID',(0,0),(-1,-1),0.25,colors.HexColor('#cbd5e1')),
             ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,LT]),
             ('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3)]
        for i,p in enumerate(preds[:mx],1):
            c=RD if p.prediction=='Attack' else GN
            tsl.append(('TEXTCOLOR',(4,i),(4,i),c))
            tsl.append(('FONTNAME',(4,i),(4,i),'Helvetica-Bold'))
        tb.setStyle(TableStyle(tsl))
        el.append(tb)
        if tot>mx:
            el.append(Spacer(1,3*mm))
            el.append(Paragraph(f'<i>Showing {mx} of {tot:,}. Use CSV for full data.</i>',
                ParagraphStyle('N',parent=bod,fontSize=8,textColor=GY)))

        el.append(Spacer(1,8*mm))
        el.append(HRFlowable(width='100%',thickness=0.5,color=colors.HexColor('#e2e8f0')))
        el.append(Spacer(1,2*mm))
        el.append(Paragraph(f'Generated by IDS/IPS Platform | {datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")} | Confidential',
            ParagraphStyle('F',parent=ss['Normal'],fontSize=7,textColor=GY,alignment=TA_CENTER)))

        doc.build(el)
        buf.seek(0)
        label='last24h' if mode=='last24h' else (bid[:8] if bid else 'all')
        return send_file(buf,mimetype='application/pdf',as_attachment=True,
                         download_name=f"ids_report_{label}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pdf")
    except ImportError:
        return jsonify({'error':'reportlab not installed'}),503