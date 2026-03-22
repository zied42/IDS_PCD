import io
import csv
from flask import Blueprint, request, jsonify, send_file, Response
from flask_jwt_extended import jwt_required
from datetime import datetime
from models.database import Prediction

export_bp = Blueprint('export', __name__)


@export_bp.route('/report', methods=['GET'])
@jwt_required()
def export_report():
    """
    GET /api/export/report
    Query params:
        format → csv (default) | pdf
        from   → 2026-01-01
        to     → 2026-12-31
    """
    fmt       = request.args.get('format', 'csv').lower()
    date_from = request.args.get('from')
    date_to   = request.args.get('to')
    batch_id  = request.args.get('batch_id')

    query = Prediction.query
    if batch_id:
        query = query.filter(Prediction.batch_id == batch_id)
    if date_from:
        query = query.filter(Prediction.timestamp >= date_from)
    if date_to:
        query = query.filter(Prediction.timestamp <= date_to)

    predictions = query.order_by(Prediction.timestamp.desc()).limit(10000).all()

    if fmt == 'csv':
        return _export_csv(predictions)
    elif fmt == 'pdf':
        return _export_pdf(predictions)
    else:
        return jsonify({'error': 'format must be csv or pdf'}), 400


def _export_csv(predictions):
    """Build CSV in memory and return as downloadable file."""
    output = io.StringIO()
    writer = csv.writer(output)

    # Headers
    writer.writerow([
        'ID', 'Timestamp', 'Src IP', 'Dst IP',
        'Src Port', 'Dst Port', 'Protocol',
        'Prediction', 'Confidence (%)', 'Model Used', 'Needs Review'
    ])

    # Rows
    for p in predictions:
        writer.writerow([
            p.id,
            p.timestamp.isoformat(),
            p.src_ip       or '',
            p.dst_ip       or '',
            p.src_port     or '',
            p.dst_port     or '',
            p.protocol     or '',
            p.prediction,
            round(p.confidence * 100, 2),
            p.model_used,
            'Yes' if p.needs_review else 'No'
        ])

    output.seek(0)
    filename = f"ids_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"

    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': f'attachment; filename={filename}'}
    )


def _export_pdf(predictions):
    """Build PDF report using reportlab and return as downloadable file."""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet

        buffer  = io.BytesIO()
        doc     = SimpleDocTemplate(buffer, pagesize=A4)
        styles  = getSampleStyleSheet()
        elements= []

        # Title
        elements.append(Paragraph('IDS Platform — Prediction Report', styles['Title']))
        elements.append(Paragraph(
            f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
            styles['Normal']
        ))
        elements.append(Spacer(1, 12))

        # Summary
        total   = len(predictions)
        attacks = sum(1 for p in predictions if p.prediction == 'Attack')
        benign  = total - attacks
        elements.append(Paragraph(
            f'Total: {total} | Attacks: {attacks} | Benign: {benign}',
            styles['Normal']
        ))
        elements.append(Spacer(1, 12))

        # Table (cap at 500 rows for PDF)
        data = [['ID', 'Timestamp', 'Src IP', 'Dst IP', 'Prediction', 'Confidence', 'Review']]
        for p in predictions[:500]:
            data.append([
                str(p.id),
                p.timestamp.strftime('%Y-%m-%d %H:%M'),
                p.src_ip or '-',
                p.dst_ip or '-',
                p.prediction,
                f'{round(p.confidence * 100, 1)}%',
                'Yes' if p.needs_review else 'No'
            ])

        table = Table(data, repeatRows=1)
        table.setStyle(TableStyle([
            ('BACKGROUND',     (0, 0), (-1, 0),  colors.HexColor('#2c3e50')),
            ('TEXTCOLOR',      (0, 0), (-1, 0),  colors.white),
            ('FONTSIZE',       (0, 0), (-1, -1), 8),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
            ('GRID',           (0, 0), (-1, -1), 0.25, colors.grey),
            ('ALIGN',          (0, 0), (-1, -1), 'CENTER'),
        ]))
        elements.append(table)

        doc.build(elements)
        buffer.seek(0)

        filename = f"ids_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pdf"
        return send_file(
            buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )

    except ImportError:
        return jsonify({'error': 'reportlab not installed. Run: pip install reportlab'}), 503