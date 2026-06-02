import React, { useState, useEffect, useMemo } from 'react';
import './AddProductModal.css';
import type { ForgingInward, ForgingInwardItem, ForgingParty, InwardWeightUnit } from '../types';
import { forgingPartyApi, forgingInwardItemsApi } from '../api/forging';

const INWARD_WEIGHT_UNITS: { value: InwardWeightUnit; label: string }[] = [
    { value: 'KG', label: 'KG' },
    { value: 'CHHOL', label: 'Chhol' },
    { value: 'TAIYAR MAAL', label: 'Taiyar Maal' },
    { value: 'REJECTION', label: 'Rejection' },
];

interface AddForgingInwardModalProps {
    onClose: () => void;
    onSubmit: (entry: Omit<ForgingInward, 'id'>) => Promise<void>;
    initialData?: ForgingInward | null;
    existingInwards?: ForgingInward[];
}

const AddForgingInwardModal: React.FC<AddForgingInwardModalProps> = ({ onClose, onSubmit, initialData, existingInwards = [] }) => {
    // Convert DD/MM/YYYY to YYYY-MM-DD for the date input
    const initDate = (() => {
        if (initialData?.date) {
            const parts = initialData.date.split('/');
            if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return new Date().toISOString().split('T')[0];
    })();

    // Form state
    const [date, setDate] = useState(initDate);
    const [partyId, setPartyId] = useState<number | ''>(initialData?.partyId ?? initialData?.party?.partyId ?? '');
    const [challanNo, setChallanNo] = useState(initialData?.challanNo ?? '');
    const [weight, setWeight] = useState<number | ''>(initialData?.weight ?? '');
    const [weightUnit, setWeightUnit] = useState<InwardWeightUnit>(initialData?.weightUnit ?? 'KG');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Parties state
    const [parties, setParties] = useState<ForgingParty[]>([]);
    const [partiesLoading, setPartiesLoading] = useState(true);

    // Add new party state
    const [showAddParty, setShowAddParty] = useState(false);
    const [newPartyName, setNewPartyName] = useState('');
    const [addingParty, setAddingParty] = useState(false);

    // Inward item state
    const [itemsOpen, setItemsOpen] = useState(true);
    const [item, setItem] = useState<ForgingInwardItem | null>(initialData?.item ?? null);
    const [newItemName, setNewItemName] = useState('');
    const [newItemPricePerKg, setNewItemPricePerKg] = useState<number | ''>('');
    const [newItemLowStockAlert, setNewItemLowStockAlert] = useState<number | ''>('');
    const [newItemQuantityInPc, setNewItemQuantityInPc] = useState<number | ''>('');
    const [newItemWeightPerPc, setNewItemWeightPerPc] = useState<number | ''>('');
    const [addingItem, setAddingItem] = useState(false);
    const [showAddItemRow, setShowAddItemRow] = useState(false);
    // "new" means user is typing a custom name not from the dropdown
    const [itemNameMode, setItemNameMode] = useState<'select' | 'new'>('select');

    // Build a deduplicated catalog from existing inwards:
    // for each unique item name, take the most recent record's fields as defaults
    const itemCatalog = useMemo(() => {
        const map = new Map<string, { pricePerKg?: number; lowStockAlert?: number; weightPerPc?: number; totalKg: number; existingPricePerKg?: number }>();
        // Sort oldest-first so latest overwrites
        const sorted = [...existingInwards].sort((a, b) => {
            const parse = (d: string) => {
                const p = d.split('/');
                return p.length === 3 ? new Date(`${p[2]}-${p[1]}-${p[0]}`).getTime() : 0;
            };
            return parse(a.date) - parse(b.date);
        });
        for (const inward of sorted) {
            if (!inward.item?.name) continue;
            // skip the current record being edited
            if (initialData?.id && inward.id === initialData.id) continue;
            const name = inward.item.name;
            const existing = map.get(name);
            const totalKg = (existing?.totalKg ?? 0) + (inward.weightUnit === 'KG' ? inward.weight : 0);
            map.set(name, {
                pricePerKg: inward.item.pricePerKg,
                lowStockAlert: inward.item.lowStockAlert,
                weightPerPc: inward.item.weightPerPc,
                totalKg,
                existingPricePerKg: inward.item.pricePerKg,
            });
        }
        return map;
    }, [existingInwards, initialData?.id]);

    const catalogNames = useMemo(() => Array.from(itemCatalog.keys()).sort(), [itemCatalog]);

    useEffect(() => {
        fetchParties();
    }, []);

    // Set item open if editing and item exists
    useEffect(() => {
        if (initialData?.item) {
            setItem(initialData.item);
            setItemsOpen(true);
            setNewItemName(initialData.item.name ?? '');
            setNewItemPricePerKg(initialData.item.pricePerKg ?? '');
            setNewItemLowStockAlert(initialData.item.lowStockAlert ?? '');
            setNewItemQuantityInPc(initialData.item.quantityInPc ?? '');
            setNewItemWeightPerPc(initialData.item.weightPerPc ?? '');
        }
    }, [initialData?.item]);

    const fetchParties = async () => {
        try {
            setPartiesLoading(true);
            const data = await forgingPartyApi.getAll();
            setParties(data);
        } catch (err) {
            console.error('Failed to fetch parties:', err);
        } finally {
            setPartiesLoading(false);
        }
    };

    const handleAddParty = async () => {
        if (!newPartyName.trim()) return;
        try {
            setAddingParty(true);
            const newParty = await forgingPartyApi.createParty(newPartyName.trim());
            const data = await forgingPartyApi.getAll();
            setParties(data);
            setPartyId(newParty.partyId);
            setNewPartyName('');
            setShowAddParty(false);
        } catch (err) {
            console.error('Failed to add party:', err);
            setError('Failed to add party');
        } finally {
            setAddingParty(false);
        }
    };

    // When a name is picked from the dropdown, pre-fill fields from catalog
    const handleSelectItemName = (name: string) => {
        setNewItemName(name);
        const entry = itemCatalog.get(name);
        if (entry) {
            setNewItemPricePerKg(entry.pricePerKg ?? '');
            setNewItemLowStockAlert(entry.lowStockAlert ?? '');
            setNewItemWeightPerPc(entry.weightPerPc ?? '');
            setNewItemQuantityInPc('');
        }
    };

    const buildItemPayload = (name: string) => {
        const payload: Omit<ForgingInwardItem, 'id' | 'inwardId'> = { name };
        if (newItemPricePerKg !== '') payload.pricePerKg = Number(newItemPricePerKg);
        if (newItemLowStockAlert !== '') payload.lowStockAlert = Number(newItemLowStockAlert);
        if (newItemWeightPerPc !== '') payload.weightPerPc = Number(newItemWeightPerPc);
        if (newItemWeightPerPc === '' && newItemQuantityInPc !== '') payload.quantityInPc = Number(newItemQuantityInPc);
        return payload;
    };

    const resetNewItemFields = () => {
        setNewItemName('');
        setNewItemPricePerKg('');
        setNewItemLowStockAlert('');
        setNewItemQuantityInPc('');
        setNewItemWeightPerPc('');
        setItemNameMode('select');
        setShowAddItemRow(false);
    };

    const handleAddItem = async () => {
        if (!newItemName.trim()) return;
        const payload = buildItemPayload(newItemName.trim());

        if (!initialData?.id) {
            setItem(payload);
            resetNewItemFields();
            return;
        }

        try {
            setAddingItem(true);
            if (item?.id) {
                const updated = await forgingInwardItemsApi.update(initialData.id, item.id, payload);
                setItem(updated);
            } else {
                const created = await forgingInwardItemsApi.create(initialData.id, payload);
                setItem(created);
            }
            resetNewItemFields();
        } catch (err) {
            console.error('Failed to save item:', err);
            setError('Failed to save item');
        } finally {
            setAddingItem(false);
        }
    };

    const handleDeleteItem = async () => {
        if (item?.id && initialData?.id) {
            try {
                await forgingInwardItemsApi.delete(initialData.id, item.id);
                setItem(null);
            } catch (err) {
                console.error('Failed to delete item:', err);
                setError('Failed to delete item');
            }
        } else {
            setItem(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setError(null);

        if (!date || !partyId || !challanNo || weight === '') {
            setError('All fields are required');
            return;
        }

        const selectedParty = parties.find(p => p.partyId === partyId);

        try {
            setLoading(true);
            const [year, month, day] = date.split('-');
            await onSubmit({
                partyId: Number(partyId),
                partyName: selectedParty?.partyName || '',
                challanNo,
                date: `${day}/${month}/${year}`,
                weight: Number(weight),
                weightUnit,
                item,
            });
        } catch (err: any) {
            console.error('Error saving entry:', err);
            setError('Failed to save entry');
        } finally {
            setLoading(false);
        }
    };

    // Weighted average calculation
    const existingCatalogEntry = newItemName ? itemCatalog.get(newItemName) : undefined;
    const isExistingItem = !!existingCatalogEntry;
    const newKg = weight !== '' ? Number(weight) : 0;
    const existingKg = existingCatalogEntry?.totalKg ?? 0;
    const existingPrice = existingCatalogEntry?.existingPricePerKg;
    const newPrice = newItemPricePerKg !== '' ? Number(newItemPricePerKg) : undefined;
    const weightedAvgPrice =
        existingPrice != null && newPrice != null && (existingKg + newKg) > 0
            ? (existingKg * existingPrice + newKg * newPrice) / (existingKg + newKg)
            : undefined;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content small-modal" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">{initialData ? 'Edit Forging Inward Entry' : 'Add Forging Inward Entry'}</h2>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit} className="modal-form">
                    {/* Row 1: Date, Party Name, Challan No */}
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Date*</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="form-input"
                                required
                            />
                        </div>

                        <div className="form-group" style={{ flex: 2 }}>
                            <label className="form-label">Party Name*</label>
                            <div className="dropdown-with-add" style={{ display: 'flex', gap: '8px' }}>
                                <select
                                    value={partyId}
                                    onChange={(e) => setPartyId(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="form-input"
                                    required
                                    disabled={partiesLoading || showAddParty}
                                    style={{ flex: 1 }}
                                >
                                    <option value="">{partiesLoading ? 'Loading...' : 'Select Party'}</option>
                                    {parties.map((party) => (
                                        <option key={party.partyId} value={party.partyId}>
                                            {party.partyName}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    className="add-new-btn"
                                    onClick={() => setShowAddParty(!showAddParty)}
                                    title="Add new party"
                                    style={{ padding: '0 12px', fontSize: '20px' }}
                                >
                                    {showAddParty ? '×' : '+'}
                                </button>
                            </div>
                            {showAddParty && (
                                <div className="add-new-input-group" style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                    <input
                                        type="text"
                                        value={newPartyName}
                                        onChange={(e) => setNewPartyName(e.target.value)}
                                        placeholder="Enter party name"
                                        className="form-input"
                                        style={{ flex: 1 }}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddParty())}
                                    />
                                    <button
                                        type="button"
                                        className="add-confirm-btn"
                                        onClick={handleAddParty}
                                        disabled={addingParty || !newPartyName.trim()}
                                    >
                                        {addingParty ? '...' : 'Add'}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Challan No*</label>
                            <input
                                type="text"
                                value={challanNo}
                                onChange={(e) => setChallanNo(e.target.value)}
                                placeholder="Challan No"
                                className="form-input"
                                required
                            />
                        </div>
                    </div>

                    {/* Row 2: Weight and Weight Unit */}
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Weight*</label>
                            <input
                                type="number"
                                value={weight}
                                onChange={(e) => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="Enter Weight"
                                className="form-input"
                                required
                                step="0.001"
                                min="0"
                            />
                        </div>

                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Weight Unit*</label>
                            <select
                                value={weightUnit}
                                onChange={(e) => setWeightUnit(e.target.value as InwardWeightUnit)}
                                className="form-input"
                                required
                            >
                                {INWARD_WEIGHT_UNITS.map(u => (
                                    <option key={u.value} value={u.value}>{u.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Inward Items Section */}
                    <div style={{ marginBottom: '16px', border: '1px solid #d0dde8', borderRadius: '8px' }}>
                        {/* Header */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 14px',
                                background: '#f4f8fb',
                                cursor: 'pointer',
                                userSelect: 'none',
                                borderRadius: item || showAddItemRow ? '8px 8px 0 0' : '8px',
                            }}
                            onClick={() => setItemsOpen(!itemsOpen)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg
                                    width="16" height="16" viewBox="0 0 24 24"
                                    fill="none" stroke="#5b9bd5" strokeWidth="2.5"
                                    strokeLinecap="round" strokeLinejoin="round"
                                    aria-hidden="true"
                                    style={{ transform: itemsOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.25s ease' }}
                                >
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                                <span style={{ fontFamily: "'Jost', sans-serif", fontSize: '14px', fontWeight: 600, color: '#17344D' }}>
                                    Inward Item {item ? `— ${item.name}` : ''}
                                </span>
                            </div>
                            <button
                                type="button"
                                title="Add item"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!itemsOpen) setItemsOpen(true);
                                    setShowAddItemRow(true);
                                }}
                                style={{
                                    width: '28px', height: '28px', borderRadius: '6px',
                                    border: '1.5px solid #5b9bd5', background: '#fff', color: '#5b9bd5',
                                    fontSize: '18px', fontWeight: 700, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#5b9bd5'; e.currentTarget.style.color = '#fff'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#5b9bd5'; }}
                            >
                                +
                            </button>
                        </div>

                        {/* Collapsible content */}
                        {itemsOpen && (
                            <div style={{ padding: '12px 14px' }}>
                                {/* Existing item summary row */}
                                {item && !showAddItemRow && (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '8px', borderBottom: '1px solid #eef2f6',
                                        fontFamily: "'Jost', sans-serif", fontSize: '13px', color: '#17344D',
                                    }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontWeight: 600 }}>{item.name}</span>
                                            <span style={{ fontSize: '11px', color: '#5b7a95' }}>
                                                {[
                                                    item.pricePerKg != null && `₹${item.pricePerKg}/kg`,
                                                    item.weightPerPc != null && `${item.weightPerPc} kg/pc`,
                                                    item.lowStockAlert != null && `alert: ${item.lowStockAlert} kg`,
                                                ].filter(Boolean).join(' · ')}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button type="button" onClick={() => setShowAddItemRow(true)}
                                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#5b9bd5', fontSize: '12px', padding: '2px 8px', borderRadius: '4px', fontFamily: "'Jost', sans-serif" }}>
                                                Edit
                                            </button>
                                            <button type="button" onClick={handleDeleteItem}
                                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#c33', fontSize: '16px', lineHeight: 1, padding: '2px 6px', borderRadius: '4px' }}>
                                                &times;
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {!item && !showAddItemRow && (
                                    <div style={{ textAlign: 'center', padding: '12px', color: '#8E8E8E', fontSize: '13px', fontFamily: "'Jost', sans-serif" }}>
                                        No item added yet. Click + to add.
                                    </div>
                                )}

                                {/* Add / Edit item form */}
                                {showAddItemRow && (
                                    <div style={{ padding: '4px 0' }}>

                                        {/* Item Name — dropdown + option to type new */}
                                        <div style={{ marginBottom: '10px' }}>
                                            <label style={{ fontSize: '12px', color: '#5b7a95', fontFamily: "'Jost', sans-serif", fontWeight: 500, marginBottom: '4px', display: 'block' }}>
                                                Item Name*
                                            </label>
                                            {itemNameMode === 'select' ? (
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <select
                                                        value={catalogNames.includes(newItemName) ? newItemName : ''}
                                                        onChange={(e) => {
                                                            if (e.target.value) handleSelectItemName(e.target.value);
                                                            else setNewItemName('');
                                                        }}
                                                        className="form-input"
                                                        style={{ flex: 1, fontSize: '13px' }}
                                                        autoFocus
                                                    >
                                                        <option value="">{catalogNames.length > 0 ? 'Select existing item…' : 'No previous items'}</option>
                                                        {catalogNames.map(n => (
                                                            <option key={n} value={n}>{n}</option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setNewItemName(''); setItemNameMode('new'); }}
                                                        style={{
                                                            whiteSpace: 'nowrap', fontSize: '12px', padding: '0 12px',
                                                            border: '1.5px solid #5b9bd5', borderRadius: '6px',
                                                            background: '#fff', color: '#5b9bd5', cursor: 'pointer',
                                                            fontFamily: "'Jost', sans-serif",
                                                        }}
                                                    >
                                                        + New
                                                    </button>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <input
                                                        type="text"
                                                        value={newItemName}
                                                        onChange={(e) => setNewItemName(e.target.value)}
                                                        placeholder="e.g. Ring, Bolt"
                                                        className="form-input"
                                                        style={{ flex: 1, fontSize: '13px', padding: '8px 10px' }}
                                                        autoFocus
                                                    />
                                                    {catalogNames.length > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setItemNameMode('select')}
                                                            style={{
                                                                whiteSpace: 'nowrap', fontSize: '12px', padding: '0 12px',
                                                                border: '1.5px solid #d0dde8', borderRadius: '6px',
                                                                background: '#fff', color: '#666', cursor: 'pointer',
                                                                fontFamily: "'Jost', sans-serif",
                                                            }}
                                                        >
                                                            ← Pick
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Existing item banner */}
                                        {isExistingItem && newItemName && (
                                            <div style={{
                                                marginBottom: '10px', padding: '8px 12px',
                                                background: '#fffbeb', border: '1px solid #f5d87a',
                                                borderRadius: '6px', fontSize: '12px',
                                                fontFamily: "'Jost', sans-serif", color: '#7a5c00',
                                                display: 'flex', alignItems: 'flex-start', gap: '8px',
                                            }}>
                                                <span style={{ fontSize: '14px' }}>⚠</span>
                                                <div>
                                                    <strong>{newItemName}</strong> already exists in inventory
                                                    {existingCatalogEntry?.totalKg ? ` (${existingCatalogEntry.totalKg.toFixed(3)} KG on record)` : ''}.
                                                    {existingPrice != null && (
                                                        <> Current price: <strong>₹{existingPrice}/kg</strong>.</>
                                                    )}
                                                    {weightedAvgPrice != null && newKg > 0 && (
                                                        <> After this inward, weighted avg price will be{' '}
                                                            <strong style={{ color: '#1a7a3c' }}>₹{weightedAvgPrice.toFixed(2)}/kg</strong>
                                                            {' '}({existingKg.toFixed(3)} kg × ₹{existingPrice} + {newKg} kg × ₹{newPrice} ÷ {(existingKg + newKg).toFixed(3)} kg).
                                                        </>
                                                    )}
                                                    {existingPrice != null && newPrice == null && (
                                                        <> Enter a price below to preview the weighted average.</>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Row 2: Price Per KG, Low Stock Alert */}
                                        <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: '12px', color: '#5b7a95', fontFamily: "'Jost', sans-serif", fontWeight: 500, marginBottom: '4px', display: 'block' }}>Price Per KG</label>
                                                <input
                                                    type="number"
                                                    value={newItemPricePerKg}
                                                    onChange={(e) => setNewItemPricePerKg(e.target.value === '' ? '' : Number(e.target.value))}
                                                    placeholder="e.g. 150.00"
                                                    className="form-input"
                                                    style={{ fontSize: '13px', padding: '8px 10px' }}
                                                    step="0.01"
                                                    min="0"
                                                />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: '12px', color: '#5b7a95', fontFamily: "'Jost', sans-serif", fontWeight: 500, marginBottom: '4px', display: 'block' }}>Low Stock Alert (KG)</label>
                                                <input
                                                    type="number"
                                                    value={newItemLowStockAlert}
                                                    onChange={(e) => setNewItemLowStockAlert(e.target.value === '' ? '' : Number(e.target.value))}
                                                    placeholder="e.g. 10"
                                                    className="form-input"
                                                    style={{ fontSize: '13px', padding: '8px 10px' }}
                                                    step="0.001"
                                                    min="0"
                                                />
                                            </div>
                                        </div>

                                        {/* Row 3: Weight Per Piece, Quantity in Pieces */}
                                        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: '12px', color: '#5b7a95', fontFamily: "'Jost', sans-serif", fontWeight: 500, marginBottom: '4px', display: 'block' }}>Weight Per Piece (KG)</label>
                                                <input
                                                    type="number"
                                                    value={newItemWeightPerPc}
                                                    onChange={(e) => setNewItemWeightPerPc(e.target.value === '' ? '' : Number(e.target.value))}
                                                    placeholder="e.g. 0.250"
                                                    className="form-input"
                                                    style={{ fontSize: '13px', padding: '8px 10px' }}
                                                    step="0.001"
                                                    min="0"
                                                />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: '12px', color: '#5b7a95', fontFamily: "'Jost', sans-serif", fontWeight: 500, marginBottom: '4px', display: 'block' }}>
                                                    Quantity (Pieces)
                                                </label>
                                                {newItemWeightPerPc !== '' ? (
                                                    <div style={{
                                                        padding: '8px 10px', background: '#f0f7ff',
                                                        border: '1px solid #c8dff5', borderRadius: '6px',
                                                        fontSize: '15px', fontWeight: 600, color: '#17344D',
                                                        fontFamily: "'Jost', sans-serif", minHeight: '38px',
                                                        display: 'flex', alignItems: 'center', gap: '6px',
                                                    }}>
                                                        {weight !== '' && Number(newItemWeightPerPc) > 0
                                                            ? <>
                                                                <span>{Math.floor(Number(weight) / Number(newItemWeightPerPc))}</span>
                                                                <span style={{ fontSize: '11px', color: '#5b9bd5', fontWeight: 400 }}>pcs (auto)</span>
                                                              </>
                                                            : <span style={{ fontSize: '12px', color: '#999', fontWeight: 400 }}>enter weight above</span>
                                                        }
                                                    </div>
                                                ) : (
                                                    <input
                                                        type="number"
                                                        value={newItemQuantityInPc}
                                                        onChange={(e) => setNewItemQuantityInPc(e.target.value === '' ? '' : Number(e.target.value))}
                                                        placeholder="e.g. 40"
                                                        className="form-input"
                                                        style={{ fontSize: '13px', padding: '8px 10px' }}
                                                        step="1"
                                                        min="0"
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (item) {
                                                        setNewItemName(item.name ?? '');
                                                        setNewItemPricePerKg(item.pricePerKg ?? '');
                                                        setNewItemLowStockAlert(item.lowStockAlert ?? '');
                                                        setNewItemQuantityInPc(item.quantityInPc ?? '');
                                                        setNewItemWeightPerPc(item.weightPerPc ?? '');
                                                    } else {
                                                        resetNewItemFields();
                                                    }
                                                    setShowAddItemRow(false);
                                                }}
                                                style={{
                                                    border: '1px solid #d0dde8', background: '#fff', cursor: 'pointer',
                                                    color: '#666', fontSize: '13px', padding: '6px 14px',
                                                    borderRadius: '6px', fontFamily: "'Jost', sans-serif",
                                                }}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                className="add-confirm-btn"
                                                onClick={handleAddItem}
                                                disabled={addingItem || !newItemName.trim()}
                                                style={{ height: '34px', fontSize: '13px', padding: '6px 16px' }}
                                            >
                                                {addingItem ? '...' : item ? 'Save' : 'Add'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="modal-actions">
                        <button type="submit" className="save-button" disabled={loading || partiesLoading}>
                            {loading ? 'Saving...' : 'Save'}
                        </button>
                        <button type="button" className="cancel-button" onClick={onClose}>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddForgingInwardModal;
