import React, { useState, useEffect, useCallback } from 'react';
import './CashflowPage.css';
import { isOwner } from '../lib/auth';
import {
    cashflowSummaryApi,
    cashflowIncomeApi,
    cashflowExpenseApi,
    cashflowPartyApi,
    cashflowPaymentTypeApi,
    cashflowAllTotalsApi,
    type AllTimeTotals,
} from '../api/cashflow';
import type {
    CashflowEntry,
    CashflowDailySummary,
    CashflowParty,
    CashflowPaymentType,
} from '../types';
import Loading from '../components/Loading';

const todayStr = () => new Date().toISOString().split('T')[0];

const shiftDate = (dateStr: string, days: number): string => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
};

const formatCurrency = (n: number) =>
    `\u20B9 ${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type EntryType = 'income' | 'expense';

const CashflowPage: React.FC = () => {
    const [selectedDate, setSelectedDate] = useState(todayStr());
    const [summary, setSummary] = useState<CashflowDailySummary | null>(null);
    const [allTimeTotals, setAllTimeTotals] = useState<AllTimeTotals | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Parties & payment types
    const [parties, setParties] = useState<CashflowParty[]>([]);
    const [paymentTypes, setPaymentTypes] = useState<CashflowPaymentType[]>([]);

    // Add form state
    const [showAddIncome, setShowAddIncome] = useState(false);
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [addAmount, setAddAmount] = useState<number | ''>('');
    const [addPartyId, setAddPartyId] = useState<number | ''>('');
    const [addPaymentTypeId, setAddPaymentTypeId] = useState<number | ''>('');
    const [addNote, setAddNote] = useState('');
    const [addLoading, setAddLoading] = useState(false);

    // Edit state
    const [editingEntry, setEditingEntry] = useState<{ id: number; type: EntryType } | null>(null);
    const [editAmount, setEditAmount] = useState<number | ''>('');
    const [editPartyId, setEditPartyId] = useState<number | ''>('');
    const [editPaymentTypeId, setEditPaymentTypeId] = useState<number | ''>('');
    const [editNote, setEditNote] = useState('');

    // New party / payment type inline
    const [showAddParty, setShowAddParty] = useState(false);
    const [newPartyName, setNewPartyName] = useState('');
    const [showAddPaymentType, setShowAddPaymentType] = useState(false);
    const [newPaymentTypeName, setNewPaymentTypeName] = useState('');

    // Payment type summary expand/collapse
    const [paymentSummaryExpanded, setPaymentSummaryExpanded] = useState(true);

    // Close day
    const [closing, setClosing] = useState(false);

    const dayClosed = summary?.dayClosed ?? false;
    const canEdit = !dayClosed || isOwner();
    const isToday = selectedDate === todayStr();

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const [dayData, allData] = await Promise.all([
                cashflowSummaryApi.get(selectedDate),
                cashflowAllTotalsApi.get(),
            ]);
            setSummary(dayData);
            setAllTimeTotals(allData);
        } catch (err: any) {
            console.error('Failed to fetch cashflow summary:', err);
            setError('Failed to load cashflow data.');
        } finally {
            setLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        cashflowPartyApi.getAll().then(setParties).catch(() => {});
        cashflowPaymentTypeApi.getAll().then(setPaymentTypes).catch(() => {});
    }, []);

    const resetAddForm = () => {
        setAddAmount('');
        setAddPartyId('');
        setAddPaymentTypeId('');
        setAddNote('');
        setShowAddIncome(false);
        setShowAddExpense(false);
    };

    const handleAdd = async (type: EntryType) => {
        if (addAmount === '' || Number(addAmount) <= 0) return;
        try {
            setAddLoading(true);
            const api = type === 'income' ? cashflowIncomeApi : cashflowExpenseApi;
            await api.create({
                date: selectedDate,
                amount: Number(addAmount),
                ...(addPartyId ? { partyId: Number(addPartyId) } : {}),
                ...(addPaymentTypeId ? { paymentTypeId: Number(addPaymentTypeId) } : {}),
                ...(addNote.trim() ? { note: addNote.trim() } : {}),
            });
            resetAddForm();
            await fetchData();
        } catch (err) {
            console.error(`Failed to add ${type}:`, err);
            setError(`Failed to add ${type} entry.`);
        } finally {
            setAddLoading(false);
        }
    };

    const handleDelete = async (id: number, type: EntryType) => {
        if (!window.confirm('Delete this entry?')) return;
        try {
            const api = type === 'income' ? cashflowIncomeApi : cashflowExpenseApi;
            await api.delete(id);
            await fetchData();
        } catch (err: any) {
            console.error('Failed to delete:', err);
            setError(err?.response?.status === 403
                ? 'This day is closed. Only the Owner can delete entries from a closed day.'
                : 'Failed to delete entry.');
        }
    };

    const startEdit = (entry: CashflowEntry, type: EntryType) => {
        setEditingEntry({ id: entry.id, type });
        setEditAmount(entry.amount);
        setEditPartyId(entry.party?.id ?? '');
        setEditPaymentTypeId(entry.paymentType?.id ?? '');
        setEditNote(entry.note ?? '');
    };

    const cancelEdit = () => {
        setEditingEntry(null);
        setEditAmount('');
        setEditPartyId('');
        setEditPaymentTypeId('');
        setEditNote('');
    };

    const handleUpdate = async () => {
        if (!editingEntry || editAmount === '' || Number(editAmount) <= 0) return;
        try {
            setAddLoading(true);
            const api = editingEntry.type === 'income' ? cashflowIncomeApi : cashflowExpenseApi;
            await api.update(editingEntry.id, {
                date: selectedDate,
                amount: Number(editAmount),
                ...(editPartyId ? { partyId: Number(editPartyId) } : {}),
                ...(editPaymentTypeId ? { paymentTypeId: Number(editPaymentTypeId) } : {}),
                ...(editNote.trim() ? { note: editNote.trim() } : {}),
            });
            cancelEdit();
            await fetchData();
        } catch (err: any) {
            console.error('Failed to update:', err);
            setError(err?.response?.status === 403
                ? 'This day is closed. Only the Owner can edit entries from a closed day.'
                : 'Failed to update entry.');
        } finally {
            setAddLoading(false);
        }
    };

    const handleCloseDay = async () => {
        if (!window.confirm(`Close day for ${selectedDate}? The balance will carry forward to next day.`)) return;
        try {
            setClosing(true);
            await cashflowSummaryApi.closeDay(selectedDate);
            await fetchData();
        } catch (err: any) {
            console.error('Failed to close day:', err);
            setError('Failed to close day. It may already be closed.');
        } finally {
            setClosing(false);
        }
    };

    const handleAddParty = async () => {
        if (!newPartyName.trim()) return;
        try {
            const p = await cashflowPartyApi.create(newPartyName.trim());
            setParties(prev => [...prev, p]);
            setAddPartyId(p.id);
            setNewPartyName('');
            setShowAddParty(false);
        } catch (err) {
            console.error('Failed to add party:', err);
        }
    };

    const handleAddPaymentType = async () => {
        if (!newPaymentTypeName.trim()) return;
        try {
            const pt = await cashflowPaymentTypeApi.create(newPaymentTypeName.trim());
            setPaymentTypes(prev => [...prev, pt]);
            setAddPaymentTypeId(pt.id);
            setNewPaymentTypeName('');
            setShowAddPaymentType(false);
        } catch (err) {
            console.error('Failed to add payment type:', err);
        }
    };

    const renderEntryRow = (entry: CashflowEntry, type: EntryType) => {
        const isEditing = editingEntry?.id === entry.id && editingEntry?.type === type;
        const isCarryForward = entry.carryForward;

        if (isEditing) {
            return (
                <tr key={entry.id}>
                    <td>
                        <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value === '' ? '' : Number(e.target.value))} style={{ width: '80px', padding: '4px 6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #ccc' }} step="0.01" min="0" autoFocus />
                    </td>
                    <td>
                        <select value={editPartyId} onChange={e => setEditPartyId(e.target.value === '' ? '' : Number(e.target.value))} style={{ fontSize: '12px', padding: '4px', borderRadius: '4px', border: '1px solid #ccc' }}>
                            <option value="">--</option>
                            {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </td>
                    <td>
                        <select value={editPaymentTypeId} onChange={e => setEditPaymentTypeId(e.target.value === '' ? '' : Number(e.target.value))} style={{ fontSize: '12px', padding: '4px', borderRadius: '4px', border: '1px solid #ccc' }}>
                            <option value="">--</option>
                            {paymentTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
                        </select>
                    </td>
                    <td>
                        <input type="text" value={editNote} onChange={e => setEditNote(e.target.value)} style={{ width: '100%', padding: '4px 6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </td>
                    <td>
                        <div className="entry-actions">
                            <button type="button" className="edit-btn" onClick={handleUpdate} disabled={addLoading} title="Save">&#10003;</button>
                            <button type="button" className="delete-btn" onClick={cancelEdit} title="Cancel">&#10005;</button>
                        </div>
                    </td>
                </tr>
            );
        }

        return (
            <tr key={entry.id} className={isCarryForward ? 'carry-forward-row' : ''}>
                <td>{formatCurrency(entry.amount)}</td>
                <td>{entry.party?.name || '-'}</td>
                <td>{entry.paymentType?.name || '-'}</td>
                <td>{entry.note || (isCarryForward ? 'Carry Forward' : '-')}</td>
                <td>
                    {canEdit && !isCarryForward && (
                        <div className="entry-actions">
                            <button type="button" className="edit-btn" onClick={() => startEdit(entry, type)} title="Edit">&#9998;</button>
                            <button type="button" className="delete-btn" onClick={() => handleDelete(entry.id, type)} title="Delete">&#10005;</button>
                        </div>
                    )}
                </td>
            </tr>
        );
    };

    const renderAddRow = (type: EntryType) => {
        const isShowing = type === 'income' ? showAddIncome : showAddExpense;
        if (!isShowing || !canEdit) return null;

        return (
            <div className="cashflow-add-row">
                <div className="form-mini-group">
                    <span className="form-mini-label">Amount*</span>
                    <input type="number" value={addAmount} onChange={e => setAddAmount(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0.00" step="0.01" min="0" autoFocus />
                </div>
                <div className="form-mini-group">
                    <span className="form-mini-label">
                        Party
                        {!showAddParty && <button type="button" onClick={() => setShowAddParty(true)} style={{ border: 'none', background: 'none', color: '#5b9bd5', cursor: 'pointer', fontSize: '13px', marginLeft: '4px' }}>+</button>}
                    </span>
                    {showAddParty ? (
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <input type="text" value={newPartyName} onChange={e => setNewPartyName(e.target.value)} placeholder="Party name" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddParty())} style={{ flex: 1 }} />
                            <button type="button" className="add-confirm-btn" onClick={handleAddParty} disabled={!newPartyName.trim()} style={{ padding: '4px 8px', fontSize: '11px' }}>Add</button>
                            <button type="button" className="add-cancel-btn" onClick={() => { setShowAddParty(false); setNewPartyName(''); }}>&times;</button>
                        </div>
                    ) : (
                        <select value={addPartyId} onChange={e => setAddPartyId(e.target.value === '' ? '' : Number(e.target.value))}>
                            <option value="">--</option>
                            {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    )}
                </div>
                <div className="form-mini-group">
                    <span className="form-mini-label">
                        Payment Type
                        {!showAddPaymentType && <button type="button" onClick={() => setShowAddPaymentType(true)} style={{ border: 'none', background: 'none', color: '#5b9bd5', cursor: 'pointer', fontSize: '13px', marginLeft: '4px' }}>+</button>}
                    </span>
                    {showAddPaymentType ? (
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <input type="text" value={newPaymentTypeName} onChange={e => setNewPaymentTypeName(e.target.value)} placeholder="Type name" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddPaymentType())} style={{ flex: 1 }} />
                            <button type="button" className="add-confirm-btn" onClick={handleAddPaymentType} disabled={!newPaymentTypeName.trim()} style={{ padding: '4px 8px', fontSize: '11px' }}>Add</button>
                            <button type="button" className="add-cancel-btn" onClick={() => { setShowAddPaymentType(false); setNewPaymentTypeName(''); }}>&times;</button>
                        </div>
                    ) : (
                        <select value={addPaymentTypeId} onChange={e => setAddPaymentTypeId(e.target.value === '' ? '' : Number(e.target.value))}>
                            <option value="">--</option>
                            {paymentTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
                        </select>
                    )}
                </div>
                <div className="form-mini-group">
                    <span className="form-mini-label">Note</span>
                    <input type="text" value={addNote} onChange={e => setAddNote(e.target.value)} placeholder="Optional note" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAdd(type))} />
                </div>
                <button type="button" className="add-confirm-btn" onClick={() => handleAdd(type)} disabled={addLoading || addAmount === '' || Number(addAmount) <= 0}>
                    {addLoading ? '...' : 'Save'}
                </button>
                <button type="button" className="add-cancel-btn" onClick={resetAddForm}>&times;</button>
            </div>
        );
    };

    if (loading) {
        return <Loading message="Loading cashflow data..." />;
    }

    const incomes = summary?.incomes || [];
    const expenses = summary?.expenses || [];

    return (
        <div className="cashflow-page">
            {/* Header */}
            <div className="page-header">
                <div className="page-title-section">
                    <h1 className="page-title">
                        Cashflow
                        <span className="cashflow-kb-hint">Ctrl+J</span>
                    </h1>
                    <p className="page-subtitle">Daily income & expense tracker with carry-forward</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {!dayClosed && (
                        <button type="button" className="cashflow-close-day-btn" onClick={handleCloseDay} disabled={closing}>
                            {closing ? 'Closing...' : 'Close Day'}
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div style={{ padding: '10px 14px', backgroundColor: '#fee', color: '#c33', borderRadius: '6px', marginBottom: '16px', fontFamily: "'Jost', sans-serif", fontSize: '13px' }}>
                    {error}
                    <button type="button" onClick={() => setError(null)} style={{ float: 'right', border: 'none', background: 'none', cursor: 'pointer', color: '#c33', fontWeight: 700 }}>&times;</button>
                </div>
            )}

            {/* Date selector */}
            <div className="cashflow-date-row">
                <div className="cashflow-date-nav">
                    <button
                        type="button"
                        className="cashflow-day-nav-btn"
                        onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}
                        title="Previous day"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <div className="cashflow-date-input-wrap">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cashflow-date-icon">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            max={todayStr()}
                            title="Select date"
                        />
                    </div>
                    <button
                        type="button"
                        className="cashflow-day-nav-btn"
                        onClick={() => setSelectedDate(shiftDate(selectedDate, 1))}
                        disabled={selectedDate >= todayStr()}
                        title="Next day"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </button>
                </div>
                <span className={`cashflow-day-badge ${dayClosed ? 'closed' : isToday ? 'today' : ''}`}>
                    {dayClosed ? (
                        <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                            Day Closed
                        </>
                    ) : isToday ? (
                        <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                            Today · Open
                        </>
                    ) : (
                        <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Open
                        </>
                    )}
                </span>
                {summary?.carryForwardAmount != null && summary.carryForwardAmount > 0 && (
                    <span className="cashflow-carry-forward-tag">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="17 1 21 5 17 9" />
                            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                            <polyline points="7 23 3 19 7 15" />
                            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                        </svg>
                        Carry Forward: {formatCurrency(summary.carryForwardAmount)}
                    </span>
                )}
            </div>

            {/* Entry date chips */}
            {(allTimeTotals?.entryDates.length ?? 0) > 0 && (
                <div className="cashflow-entry-dates">
                    <span className="cashflow-entry-dates-label">Pending carry-forward:</span>
                    <div className="cashflow-entry-dates-chips">
                        {allTimeTotals!.entryDates.map(({ date }) => (
                            <button
                                key={date}
                                type="button"
                                className={`cashflow-date-chip pending ${date === selectedDate ? 'active' : ''}`}
                                onClick={() => setSelectedDate(date)}
                                title="Entries added — not yet carried forward"
                            >
                                {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                                <span className="cashflow-date-chip-dot" />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Summary cards — all-time totals */}
            <div className="cashflow-summary-grid">
                <div className="cashflow-summary-card">
                    <span className="stat-title">Total Income</span>
                    <span className="stat-value income">{formatCurrency(allTimeTotals?.totalIncome ?? 0)}</span>
                    <span className="stat-subtitle">All time · excl. carry-forward</span>
                </div>
                <div className="cashflow-summary-card">
                    <span className="stat-title">Total Expense</span>
                    <span className="stat-value expense">{formatCurrency(allTimeTotals?.totalExpense ?? 0)}</span>
                    <span className="stat-subtitle">All time · excl. carry-forward</span>
                </div>
                <div className="cashflow-summary-card">
                    <span className="stat-title">Net Balance</span>
                    <span className={`stat-value ${(allTimeTotals?.netBalance ?? 0) >= 0 ? 'positive' : 'negative'}`}>
                        {(allTimeTotals?.netBalance ?? 0) < 0 ? '- ' : ''}{formatCurrency(allTimeTotals?.netBalance ?? 0)}
                    </span>
                    <span className="stat-subtitle">All time · income − expense</span>
                </div>
                <div className="cashflow-summary-card">
                    <span className="stat-title">Selected Day Net</span>
                    <span className={`stat-value ${(summary?.netBalance ?? 0) >= 0 ? 'positive' : 'negative'}`}>
                        {(summary?.netBalance ?? 0) < 0 ? '- ' : ''}{formatCurrency(summary?.netBalance ?? 0)}
                    </span>
                    <span className="stat-subtitle">Incl. carry-forward</span>
                </div>
            </div>

            {/* Payment Type Summary — all-time totals, owner only */}
            {isOwner() && (allTimeTotals?.byPaymentType.length ?? 0) > 0 && (
                <div className="cashflow-party-summary-section">
                    <button
                        type="button"
                        className="cashflow-party-summary-toggle"
                        onClick={() => setPaymentSummaryExpanded(e => !e)}
                    >
                        <span className="cashflow-party-summary-toggle-title">Payment Type Summary</span>
                        <span className={`cashflow-party-summary-chevron ${paymentSummaryExpanded ? 'expanded' : ''}`}>&#8964;</span>
                    </button>
                    {paymentSummaryExpanded && (
                        <div className="cashflow-party-cards">
                            {allTimeTotals!.byPaymentType.map(p => (
                                <div key={p.paymentTypeId} className="cashflow-party-card">
                                    <span className="cashflow-party-name">{p.paymentTypeName}</span>
                                    <div className="cashflow-party-amounts">
                                        {p.totalIncome > 0 && (
                                            <span className="cashflow-party-amount income">{formatCurrency(p.totalIncome)}</span>
                                        )}
                                        {p.totalExpense > 0 && (
                                            <span className="cashflow-party-amount expense">- {formatCurrency(p.totalExpense)}</span>
                                        )}
                                        <span className={`cashflow-party-amount net ${p.netBalance >= 0 ? 'positive' : 'negative'}`}>
                                            {p.netBalance < 0 ? '- ' : ''}{formatCurrency(p.netBalance)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Income & Expense columns */}
            <div className="cashflow-columns">
                {/* Income */}
                <div className="cashflow-column">
                    <div className="cashflow-column-header">
                        <span className="cashflow-column-title income">Income ({incomes.length})</span>
                        <button
                            type="button"
                            className="cashflow-add-btn"
                            onClick={() => { resetAddForm(); setShowAddIncome(true); }}
                            disabled={!canEdit}
                            title="Add income"
                        >+</button>
                    </div>
                    <table className="cashflow-table">
                        <thead>
                            <tr>
                                <th>Amount</th>
                                <th>Party</th>
                                <th>Payment</th>
                                <th>Note</th>
                                <th style={{ width: '60px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {incomes.length > 0 ? (
                                incomes.map(e => renderEntryRow(e, 'income'))
                            ) : (
                                <tr><td className="no-data" colSpan={5}>No income entries</td></tr>
                            )}
                        </tbody>
                        {incomes.length > 0 && (
                            <tfoot>
                                <tr className="cashflow-table-total-row">
                                    <td className="cashflow-table-total-label" colSpan={4}>Total Income</td>
                                    <td className="cashflow-table-total-value income">{formatCurrency(summary?.totalIncome ?? 0)}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                    {renderAddRow('income')}
                </div>

                {/* Expense */}
                <div className="cashflow-column">
                    <div className="cashflow-column-header">
                        <span className="cashflow-column-title expense">Expense ({expenses.length})</span>
                        <button
                            type="button"
                            className="cashflow-add-btn"
                            onClick={() => { resetAddForm(); setShowAddExpense(true); }}
                            disabled={!canEdit}
                            title="Add expense"
                        >+</button>
                    </div>
                    <table className="cashflow-table">
                        <thead>
                            <tr>
                                <th>Amount</th>
                                <th>Party</th>
                                <th>Payment</th>
                                <th>Note</th>
                                <th style={{ width: '60px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {expenses.length > 0 ? (
                                expenses.map(e => renderEntryRow(e, 'expense'))
                            ) : (
                                <tr><td className="no-data" colSpan={5}>No expense entries</td></tr>
                            )}
                        </tbody>
                        {expenses.length > 0 && (
                            <tfoot>
                                <tr className="cashflow-table-total-row">
                                    <td className="cashflow-table-total-label" colSpan={4}>Total Expense</td>
                                    <td className="cashflow-table-total-value expense">{formatCurrency(summary?.totalExpense ?? 0)}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                    {renderAddRow('expense')}
                </div>
            </div>
        </div>
    );
};

export default CashflowPage;
