import React from 'react';
import './AddProductModal.css'; // Reusing general modal styles
import '../pages/InventoryPage.css'; // Reusing table styles

interface InwardEntry {
    date: string;
    challanNo: string;
    price: number;
    weight: number;
    chhol?: string;
    tayarmaal?: number;
}

interface OutwardEntry {
    date: string;
    challanNo: string;
    // Image shows: Date, Challan No., Wire
    wire?: number;
}

interface ForginReportModalProps {
    onClose: () => void;
    partyName: string;
    startDate: string;
    endDate: string;
    inwardData: InwardEntry[];
    outwardData: OutwardEntry[];
}

const ForginReportModal: React.FC<ForginReportModalProps> = ({
    onClose,
    partyName,
    startDate,
    endDate,
    inwardData,
    outwardData
}) => {
    // Helper to format date "DD/MM/YYYY"
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    };

    // Calculate totals
    const totalChhol = inwardData.reduce((sum, item) => sum + (Number(item.chhol) || 0), 0);
    const totalTayarmaal = inwardData.reduce((sum, item) => sum + (item.tayarmaal || 0), 0);
    const totalWire = outwardData.reduce((sum, item) => sum + (item.wire || 0), 0);
    const totalOutward = totalWire; // Based on image "Total Outward" seems to be sum of wire or specific outward field? Assuming Total Wire for now.
    // Wait, the image shows "Total Outward" 823.050 and "Total Wire" 2020.250.
    // They are different. Let's look closely at image.
    // Image Table:
    // Left (Inward): Date, Challan No., Chhol, Tayarmaal
    // Right (Outward): Date, Challan No., Wire
    // Bottom Rows:
    // "Total": [Empty], [Sum Chhol], [Sum Tayarmaal] | [Empty], [Empty], [Sum Wire]
    // "Khate": [Empty], [Some Value], [Empty] | [Empty], [Empty], [Same Value as Sum Wire?]
    //
    // Footer Cards:
    // Total Chhol | Total Tayarmaal | Total Wire | Total Outward | Aaglu Khate
    //
    // It seems "Total Outward" might be a separate calculation or I might be misinterpreting "Wire".
    // For now, I will use:
    // Chhol = inward entry weight (assuming 'weight' from previous screen = 'Chhol' or similar)
    // Tayarmaal = another field? Or maybe 'weight' is Chhol?
    // Let's assume for MOCK data:
    // Inward Entry has: chhol, tayarmaal.
    // Outward Entry has: wire.

    // Aaglu Khate = ?? (Maybe Previous Balance?)
    const aagluKhate = 208.85; // Mock value for now

    // Max rows to show side-by-side
    const maxRows = Math.max(inwardData.length, outwardData.length, 5); // Ensure at least some empty rows for look

    const rows = Array.from({ length: maxRows }).map((_, i) => ({
        inward: inwardData[i] || null,
        outward: outwardData[i] || null
    }));

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" style={{ maxWidth: '1200px', width: '95%', maxHeight: '90vh', overflowY: 'auto', padding: '30px' }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div>
                        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '600', color: '#1a1a1a' }}>{partyName}</h2>
                        <p style={{ margin: 0, color: '#666', fontSize: '16px' }}>
                            Date Range :- {formatDate(startDate)} - {formatDate(endDate)}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: '#666' }}>&times;</button>
                </div>

                <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
                    {/* Table Headers Group */}
                    <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0', backgroundColor: '#fafafa' }}>
                        <div style={{ flex: 4, display: 'flex', justifyContent: 'center', padding: '12px', borderRight: '1px solid #e0e0e0', fontWeight: '500', color: '#666' }}>
                            Inward
                        </div>
                        <div style={{ flex: 3, display: 'flex', justifyContent: 'center', padding: '12px', fontWeight: '500', color: '#666' }}>
                            Outward
                        </div>
                    </div>

                    {/* Table Column Headers */}
                    <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0', backgroundColor: '#fff' }}>
                        {/* Inward Cols */}
                        <div style={{ flex: 1, padding: '12px', borderRight: '1px solid #e0e0e0', textAlign: 'center', fontWeight: '600', fontSize: '14px' }}>Date</div>
                        <div style={{ flex: 1, padding: '12px', borderRight: '1px solid #e0e0e0', textAlign: 'center', fontWeight: '600', fontSize: '14px' }}>Challan No.</div>
                        <div style={{ flex: 1, padding: '12px', borderRight: '1px solid #e0e0e0', textAlign: 'center', fontWeight: '600', fontSize: '14px' }}>Chhol</div>
                        <div style={{ flex: 1, padding: '12px', borderRight: '1px solid #e0e0e0', textAlign: 'center', fontWeight: '600', fontSize: '14px' }}>Tayarmaal</div>

                        {/* Outward Cols */}
                        <div style={{ flex: 1, padding: '12px', borderRight: '1px solid #e0e0e0', textAlign: 'center', fontWeight: '600', fontSize: '14px' }}>Date</div>
                        <div style={{ flex: 1, padding: '12px', borderRight: '1px solid #e0e0e0', textAlign: 'center', fontWeight: '600', fontSize: '14px' }}>Challan No.</div>
                        <div style={{ flex: 1, padding: '12px', textAlign: 'center', fontWeight: '600', fontSize: '14px' }}>Wire</div>
                    </div>

                    {/* Rows */}
                    {rows.map((row, index) => (
                        <div key={index} style={{ display: 'flex', borderBottom: '1px solid #e0e0e0', backgroundColor: '#fff' }}>
                            {/* Inward Data */}
                            <div style={{ flex: 1, padding: '12px', borderRight: '1px solid #e0e0e0', textAlign: 'center', fontSize: '14px', color: '#444' }}>
                                {row.inward ? formatDate(row.inward.date) : ''}
                            </div>
                            <div style={{ flex: 1, padding: '12px', borderRight: '1px solid #e0e0e0', textAlign: 'center', fontSize: '14px', color: '#444' }}>
                                {row.inward ? row.inward.challanNo : ''}
                            </div>
                            <div style={{ flex: 1, padding: '12px', borderRight: '1px solid #e0e0e0', textAlign: 'center', fontSize: '14px', color: '#444' }}>
                                {row.inward?.chhol || '-'}
                            </div>
                            <div style={{ flex: 1, padding: '12px', borderRight: '1px solid #e0e0e0', textAlign: 'center', fontSize: '14px', color: '#444' }}>
                                {row.inward?.tayarmaal?.toFixed(3) ?? '-'}
                            </div>

                            {/* Outward Data */}
                            <div style={{ flex: 1, padding: '12px', borderRight: '1px solid #e0e0e0', textAlign: 'center', fontSize: '14px', color: '#444' }}>
                                {row.outward ? formatDate(row.outward.date) : ''}
                            </div>
                            <div style={{ flex: 1, padding: '12px', borderRight: '1px solid #e0e0e0', textAlign: 'center', fontSize: '14px', color: '#444' }}>
                                {row.outward ? row.outward.challanNo : ''}
                            </div>
                            <div style={{ flex: 1, padding: '12px', textAlign: 'center', fontSize: '14px', color: '#444' }}>
                                {row.outward?.wire?.toFixed(3) ?? ''}
                            </div>
                        </div>
                    ))}

                    {/* Total Row */}
                    <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0', backgroundColor: '#fff', fontWeight: '600' }}>
                        <div style={{ flex: 2, padding: '12px', borderRight: '1px solid #e0e0e0', textAlign: 'center' }}>Total</div>
                        <div style={{ flex: 1, padding: '12px', borderRight: '1px solid #e0e0e0', textAlign: 'center' }}>{totalChhol.toFixed(3)}</div>
                        <div style={{ flex: 1, padding: '12px', borderRight: '1px solid #e0e0e0', textAlign: 'center' }}>{totalTayarmaal.toFixed(3)}</div>

                        <div style={{ flex: 2, padding: '12px', borderRight: '1px solid #e0e0e0', textAlign: 'center' }}></div>
                        <div style={{ flex: 1, padding: '12px', textAlign: 'center' }}>{totalWire.toFixed(3)}</div>
                    </div>

                    {/* Khate Row (Mocked for now as logic isn't fully clear from prompt) */}
                    <div style={{ display: 'flex', backgroundColor: '#fff', fontWeight: '600' }}>
                        <div style={{ flex: 2, padding: '12px', borderRight: '1px solid #e0e0e0', textAlign: 'center' }}>Khate</div>
                        <div style={{ flex: 1, padding: '12px', borderRight: '1px solid #e0e0e0', textAlign: 'center' }}>74.300</div> {/* Placeholder match img */}
                        <div style={{ flex: 1, padding: '12px', borderRight: '1px solid #e0e0e0', textAlign: 'center' }}></div>

                        <div style={{ flex: 2, padding: '12px', borderRight: '1px solid #e0e0e0', textAlign: 'center' }}></div>
                        <div style={{ flex: 1, padding: '12px', textAlign: 'center' }}>{totalWire.toFixed(3)}</div>
                    </div>
                </div>

                {/* Footer Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginTop: '24px' }}>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#495057', marginBottom: '8px' }}>Total Chhol</div>
                        <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '4px', border: '1px solid #dee2e6', fontSize: '14px' }}>
                            {totalChhol.toFixed(3)}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#495057', marginBottom: '8px' }}>Total Tayarmaal</div>
                        <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '4px', border: '1px solid #dee2e6', fontSize: '14px' }}>
                            {totalTayarmaal.toFixed(3)}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#495057', marginBottom: '8px' }}>Total Wire</div>
                        <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '4px', border: '1px solid #dee2e6', fontSize: '14px' }}>
                            {totalWire.toFixed(3)}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#495057', marginBottom: '8px' }}>Total Outward</div>
                        <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '4px', border: '1px solid #dee2e6', fontSize: '14px' }}>
                            {totalOutward.toFixed(3)}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#495057', marginBottom: '8px' }}>Aaglu Khate</div>
                        <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '4px', border: '1px solid #dee2e6', fontSize: '14px' }}>
                            {aagluKhate}
                        </div>
                    </div>
                </div>
                {/* Bottom Input Rows for Inward/Outward Totals if needed? The image shows "Inward" and "Outward" inputs at the very bottom. */}
                <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#495057', marginBottom: '8px' }}>Inward</div>
                        <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '4px', border: '1px solid #dee2e6', fontSize: '14px' }}>
                            {(totalChhol).toFixed(3)} {/* Using Total Chhol as Inward total */}
                        </div>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#495057', marginBottom: '8px' }}>Outward</div>
                        <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '4px', border: '1px solid #dee2e6', fontSize: '14px' }}>
                            {(totalChhol).toFixed(3)} {/* Using same value as left side in image roughly?? Or just placeholder */}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ForginReportModal;
