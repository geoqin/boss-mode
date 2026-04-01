"use client"

import { useState, useEffect, useCallback, useRef, KeyboardEvent } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/app/components/auth/AuthProvider"

interface ListItem {
    id: string
    list_id: string
    text: string
    depth: number
    checked: boolean
    sort_order: number
    created_at: string
}

interface UserList {
    id: string
    user_id: string
    name: string
    type: 'bullet' | 'checkbox'
    sort_order: number
    created_at: string
    items?: ListItem[]
}

interface ListsWidgetProps {
    isDark: boolean
}

export function ListsWidget({ isDark }: ListsWidgetProps) {
    const { user } = useAuth()
    const supabase = useState(() => createClient())[0]

    const [lists, setLists] = useState<UserList[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedListId, setExpandedListId] = useState<string | null>(null)
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [newListName, setNewListName] = useState("")
    const [newListType, setNewListType] = useState<'bullet' | 'checkbox'>('bullet')
    const [newItemText, setNewItemText] = useState("")
    const [newItemDepth, setNewItemDepth] = useState(0)
    const [editingListId, setEditingListId] = useState<string | null>(null)
    const [editingName, setEditingName] = useState("")
    const [editingItemId, setEditingItemId] = useState<string | null>(null)
    const [editingItemText, setEditingItemText] = useState("")
    const newItemInputRef = useRef<HTMLInputElement>(null)

    const textPrimary = isDark ? "#f5f5f7" : "#1a1a1a"
    const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)"
    const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"
    const hoverBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"

    // Fetch lists with items
    const fetchLists = useCallback(async () => {
        if (!user) return
        const { data: listsData } = await supabase
            .from('lists')
            .select('*')
            .eq('user_id', user.id)
            .order('sort_order')

        if (listsData) {
            // Fetch items for all lists
            const listIds = listsData.map(l => l.id)
            const { data: itemsData } = await supabase
                .from('list_items')
                .select('*')
                .in('list_id', listIds)
                .order('sort_order')

            const listsWithItems: UserList[] = listsData.map(list => ({
                ...list,
                items: (itemsData || []).filter(item => item.list_id === list.id)
            }))
            setLists(listsWithItems)
        }
        setLoading(false)
    }, [user, supabase])

    useEffect(() => { fetchLists() }, [fetchLists])

    // Create a new list
    const createList = async () => {
        if (!user || !newListName.trim()) return
        const { data, error } = await supabase
            .from('lists')
            .insert({
                user_id: user.id,
                name: newListName.trim(),
                type: newListType,
                sort_order: lists.length
            })
            .select()
            .single()

        if (data) {
            setLists(prev => [...prev, { ...data, items: [] }])
            setNewListName("")
            setShowCreateForm(false)
            setExpandedListId(data.id)
        }
    }

    // Delete a list
    const deleteList = async (listId: string) => {
        await supabase.from('lists').delete().eq('id', listId)
        setLists(prev => prev.filter(l => l.id !== listId))
        if (expandedListId === listId) setExpandedListId(null)
    }

    // Rename a list
    const renameList = async (listId: string) => {
        if (!editingName.trim()) return
        await supabase.from('lists').update({ name: editingName.trim() }).eq('id', listId)
        setLists(prev => prev.map(l => l.id === listId ? { ...l, name: editingName.trim() } : l))
        setEditingListId(null)
        setEditingName("")
    }

    // Add item to a list
    const addItem = async (listId: string) => {
        if (!newItemText.trim()) return
        const list = lists.find(l => l.id === listId)
        if (!list) return

        const sortOrder = (list.items?.length || 0)
        const { data } = await supabase
            .from('list_items')
            .insert({
                list_id: listId,
                text: newItemText.trim(),
                depth: list.type === 'bullet' ? newItemDepth : 0,
                checked: false,
                sort_order: sortOrder
            })
            .select()
            .single()

        if (data) {
            setLists(prev => prev.map(l =>
                l.id === listId ? { ...l, items: [...(l.items || []), data] } : l
            ))
            setNewItemText("")
            // Keep depth for bullet lists (user might want same indent level)
            if (list.type !== 'bullet') setNewItemDepth(0)
        }
    }

    // Toggle checkbox item
    const toggleItem = async (listId: string, itemId: string) => {
        const list = lists.find(l => l.id === listId)
        const item = list?.items?.find(i => i.id === itemId)
        if (!item) return

        const newChecked = !item.checked
        await supabase.from('list_items').update({ checked: newChecked }).eq('id', itemId)
        setLists(prev => prev.map(l =>
            l.id === listId ? {
                ...l,
                items: l.items?.map(i => i.id === itemId ? { ...i, checked: newChecked } : i)
            } : l
        ))
    }

    // Delete item
    const deleteItem = async (listId: string, itemId: string) => {
        await supabase.from('list_items').delete().eq('id', itemId)
        setLists(prev => prev.map(l =>
            l.id === listId ? { ...l, items: l.items?.filter(i => i.id !== itemId) } : l
        ))
    }

    // Update item text
    const updateItemText = async (listId: string, itemId: string) => {
        if (!editingItemText.trim()) return
        await supabase.from('list_items').update({ text: editingItemText.trim() }).eq('id', itemId)
        setLists(prev => prev.map(l =>
            l.id === listId ? {
                ...l,
                items: l.items?.map(i => i.id === itemId ? { ...i, text: editingItemText.trim() } : i)
            } : l
        ))
        setEditingItemId(null)
        setEditingItemText("")
    }

    // Handle Tab/Shift+Tab for indentation in bullet mode
    const handleNewItemKeyDown = (e: KeyboardEvent<HTMLInputElement>, listId: string, listType: string) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            addItem(listId)
        } else if (e.key === 'Tab' && listType === 'bullet') {
            e.preventDefault()
            if (e.shiftKey) {
                setNewItemDepth(prev => Math.max(0, prev - 1))
            } else {
                setNewItemDepth(prev => Math.min(2, prev + 1))
            }
        }
    }

    // Indent/outdent existing items
    const changeItemDepth = async (listId: string, itemId: string, delta: number) => {
        const list = lists.find(l => l.id === listId)
        const item = list?.items?.find(i => i.id === itemId)
        if (!item) return

        const newDepth = Math.max(0, Math.min(2, item.depth + delta))
        if (newDepth === item.depth) return

        await supabase.from('list_items').update({ depth: newDepth }).eq('id', itemId)
        setLists(prev => prev.map(l =>
            l.id === listId ? {
                ...l,
                items: l.items?.map(i => i.id === itemId ? { ...i, depth: newDepth } : i)
            } : l
        ))
    }

    const depthPadding = (depth: number) => depth * 20

    const bulletChar = (depth: number) => {
        return ['•', '◦', '▪'][depth] || '•'
    }

    if (loading) {
        return (
            <div className={`widget-card ${isDark ? "" : "widget-card-light"}`}>
                <div style={{ fontSize: 11, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>
                    📋 Lists
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[1, 2].map(i => (
                        <div key={i} className={isDark ? "skeleton" : "skeleton-light"} style={{ height: 32 }} />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className={`widget-card ${isDark ? "widget-lists" : "widget-card-light widget-lists-light"}`}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 11, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    📋 Lists
                </div>
                <button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    style={{
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: 16, color: textMuted, padding: "2px 4px",
                    }}
                    title="Create list"
                >
                    {showCreateForm ? "✕" : "+"}
                </button>
            </div>

            {/* Create form */}
            {showCreateForm && (
                <div style={{
                    marginBottom: 12, padding: 10, borderRadius: 10,
                    background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                    border: `1px solid ${borderColor}`,
                }}>
                    <input
                        type="text"
                        placeholder="List name..."
                        value={newListName}
                        onChange={e => setNewListName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && createList()}
                        autoFocus
                        style={{
                            width: "100%", padding: "8px 10px", borderRadius: 8, fontSize: 13,
                            background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                            border: `1px solid ${borderColor}`, color: textPrimary, outline: "none",
                            marginBottom: 8,
                        }}
                    />
                    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                        <button
                            onClick={() => setNewListType('bullet')}
                            style={{
                                flex: 1, padding: "6px 8px", borderRadius: 6, fontSize: 12, cursor: "pointer",
                                border: `1px solid ${newListType === 'bullet' ? '#f97316' : borderColor}`,
                                background: newListType === 'bullet'
                                    ? (isDark ? "rgba(249,115,22,0.15)" : "rgba(249,115,22,0.08)")
                                    : "transparent",
                                color: newListType === 'bullet' ? '#f97316' : textMuted,
                                fontWeight: newListType === 'bullet' ? 600 : 400,
                                transition: "all 0.2s",
                            }}
                        >
                            • Bullets
                        </button>
                        <button
                            onClick={() => setNewListType('checkbox')}
                            style={{
                                flex: 1, padding: "6px 8px", borderRadius: 6, fontSize: 12, cursor: "pointer",
                                border: `1px solid ${newListType === 'checkbox' ? '#f97316' : borderColor}`,
                                background: newListType === 'checkbox'
                                    ? (isDark ? "rgba(249,115,22,0.15)" : "rgba(249,115,22,0.08)")
                                    : "transparent",
                                color: newListType === 'checkbox' ? '#f97316' : textMuted,
                                fontWeight: newListType === 'checkbox' ? 600 : 400,
                                transition: "all 0.2s",
                            }}
                        >
                            ☑ Checkbox
                        </button>
                    </div>
                    <button
                        onClick={createList}
                        disabled={!newListName.trim()}
                        style={{
                            width: "100%", padding: "7px", borderRadius: 8, border: "none",
                            background: newListName.trim() ? "linear-gradient(135deg, #f97316, #facc15)" : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"),
                            color: newListName.trim() ? "white" : textMuted,
                            fontWeight: 600, fontSize: 13, cursor: newListName.trim() ? "pointer" : "default",
                            transition: "all 0.2s",
                        }}
                    >
                        Create List
                    </button>
                </div>
            )}

            {/* Lists */}
            {lists.length === 0 && !showCreateForm ? (
                <div style={{ fontSize: 13, opacity: 0.4, textAlign: "center", padding: "16px 0" }}>
                    No lists yet. Tap + to create one.
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {lists.map(list => {
                        const isExpanded = expandedListId === list.id
                        const checkedCount = list.type === 'checkbox'
                            ? (list.items || []).filter(i => i.checked).length
                            : 0
                        const totalCount = (list.items || []).length

                        return (
                            <div key={list.id}>
                                {/* List header row */}
                                <div
                                    onClick={() => setExpandedListId(isExpanded ? null : list.id)}
                                    style={{
                                        display: "flex", justifyContent: "space-between", alignItems: "center",
                                        padding: "8px 10px", borderRadius: 8, cursor: "pointer",
                                        transition: "background 0.15s",
                                        background: isExpanded
                                            ? (isDark ? "rgba(249,115,22,0.08)" : "rgba(249,115,22,0.04)")
                                            : "transparent",
                                    }}
                                    onMouseOver={e => { if (!isExpanded) e.currentTarget.style.background = hoverBg }}
                                    onMouseOut={e => { if (!isExpanded) e.currentTarget.style.background = "transparent" }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                                        <span style={{ fontSize: 10, opacity: 0.5, transition: "transform 0.2s", transform: isExpanded ? "rotate(90deg)" : "none" }}>
                                            ▶
                                        </span>
                                        {editingListId === list.id ? (
                                            <input
                                                value={editingName}
                                                onChange={e => setEditingName(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') renameList(list.id)
                                                    if (e.key === 'Escape') { setEditingListId(null); setEditingName("") }
                                                }}
                                                onBlur={() => renameList(list.id)}
                                                onClick={e => e.stopPropagation()}
                                                autoFocus
                                                style={{
                                                    background: "transparent", border: "none", borderBottom: `1px solid ${borderColor}`,
                                                    color: textPrimary, fontSize: 13, fontWeight: 600, outline: "none",
                                                    padding: "2px 0", width: "100%",
                                                }}
                                            />
                                        ) : (
                                            <span
                                                style={{ fontSize: 13, fontWeight: 600, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                                                onDoubleClick={e => {
                                                    e.stopPropagation()
                                                    setEditingListId(list.id)
                                                    setEditingName(list.name)
                                                }}
                                            >
                                                {list.name}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                        <span style={{ fontSize: 11, color: textMuted }}>
                                            {list.type === 'checkbox' ? `${checkedCount}/${totalCount}` : totalCount}
                                        </span>
                                        <span style={{ fontSize: 12, opacity: 0.4 }}>
                                            {list.type === 'bullet' ? '•' : '☑'}
                                        </span>
                                    </div>
                                </div>

                                {/* Expanded list content */}
                                {isExpanded && (
                                    <div style={{
                                        paddingLeft: 8, paddingRight: 4, paddingBottom: 8, paddingTop: 4,
                                        borderLeft: `2px solid ${isDark ? "rgba(249,115,22,0.2)" : "rgba(249,115,22,0.15)"}`,
                                        marginLeft: 14, marginTop: 2,
                                    }}>
                                        {/* Items */}
                                        {(list.items || []).map(item => (
                                            <div
                                                key={item.id}
                                                style={{
                                                    display: "flex", alignItems: "flex-start", gap: 6,
                                                    paddingLeft: depthPadding(item.depth),
                                                    padding: `3px 4px 3px ${depthPadding(item.depth) + 4}px`,
                                                    borderRadius: 4, transition: "background 0.15s",
                                                }}
                                                onMouseOver={e => e.currentTarget.style.background = hoverBg}
                                                onMouseOut={e => e.currentTarget.style.background = "transparent"}
                                            >
                                                {list.type === 'checkbox' ? (
                                                    <input
                                                        type="checkbox"
                                                        checked={item.checked}
                                                        onChange={() => toggleItem(list.id, item.id)}
                                                        style={{
                                                            marginTop: 3, cursor: "pointer", accentColor: "#f97316",
                                                            width: 14, height: 14, flexShrink: 0,
                                                        }}
                                                    />
                                                ) : (
                                                    <span style={{
                                                        fontSize: 13, color: textMuted, marginTop: 1,
                                                        width: 14, textAlign: "center", flexShrink: 0,
                                                    }}>
                                                        {bulletChar(item.depth)}
                                                    </span>
                                                )}

                                                {editingItemId === item.id ? (
                                                    <input
                                                        value={editingItemText}
                                                        onChange={e => setEditingItemText(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') updateItemText(list.id, item.id)
                                                            if (e.key === 'Escape') { setEditingItemId(null); setEditingItemText("") }
                                                        }}
                                                        onBlur={() => updateItemText(list.id, item.id)}
                                                        autoFocus
                                                        style={{
                                                            flex: 1, background: "transparent", border: "none",
                                                            borderBottom: `1px solid ${borderColor}`,
                                                            color: textPrimary, fontSize: 13, outline: "none", padding: "1px 0",
                                                        }}
                                                    />
                                                ) : (
                                                    <span
                                                        style={{
                                                            flex: 1, fontSize: 13, color: textPrimary, lineHeight: 1.4,
                                                            textDecoration: item.checked ? "line-through" : "none",
                                                            opacity: item.checked ? 0.5 : 1,
                                                            cursor: "text",
                                                        }}
                                                        onClick={() => {
                                                            setEditingItemId(item.id)
                                                            setEditingItemText(item.text)
                                                        }}
                                                    >
                                                        {item.text}
                                                    </span>
                                                )}

                                                <div style={{ display: "flex", gap: 2, flexShrink: 0, opacity: 0.4 }}>
                                                    {list.type === 'bullet' && (
                                                        <>
                                                            {item.depth > 0 && (
                                                                <button
                                                                    onClick={() => changeItemDepth(list.id, item.id, -1)}
                                                                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: textMuted, padding: "2px" }}
                                                                    title="Outdent"
                                                                >←</button>
                                                            )}
                                                            {item.depth < 2 && (
                                                                <button
                                                                    onClick={() => changeItemDepth(list.id, item.id, 1)}
                                                                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: textMuted, padding: "2px" }}
                                                                    title="Indent"
                                                                >→</button>
                                                            )}
                                                        </>
                                                    )}
                                                    <button
                                                        onClick={() => deleteItem(list.id, item.id)}
                                                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "#ef4444", padding: "2px" }}
                                                        title="Delete"
                                                    >✕</button>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Add item input */}
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, paddingLeft: list.type === 'bullet' ? depthPadding(newItemDepth) : 0 }}>
                                            {list.type === 'bullet' && (
                                                <span style={{ fontSize: 13, color: textMuted, width: 14, textAlign: "center", flexShrink: 0, opacity: 0.4 }}>
                                                    {bulletChar(newItemDepth)}
                                                </span>
                                            )}
                                            <input
                                                ref={newItemInputRef}
                                                type="text"
                                                placeholder={list.type === 'bullet' ? "Add item (Tab to indent)..." : "Add item..."}
                                                value={newItemText}
                                                onChange={e => setNewItemText(e.target.value)}
                                                onKeyDown={e => handleNewItemKeyDown(e, list.id, list.type)}
                                                style={{
                                                    flex: 1, padding: "6px 8px", borderRadius: 6, fontSize: 12,
                                                    background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                                                    border: `1px solid ${borderColor}`, color: textPrimary, outline: "none",
                                                    transition: "border-color 0.2s",
                                                }}
                                                onFocus={e => e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"}
                                                onBlur={e => e.currentTarget.style.borderColor = borderColor}
                                            />
                                        </div>

                                        {/* List actions */}
                                        <div style={{
                                            display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8,
                                            paddingTop: 6, borderTop: `1px solid ${borderColor}`,
                                        }}>
                                            <button
                                                onClick={() => { setEditingListId(list.id); setEditingName(list.name) }}
                                                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: textMuted }}
                                            >
                                                Rename
                                            </button>
                                            <button
                                                onClick={() => deleteList(list.id)}
                                                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#ef4444" }}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
