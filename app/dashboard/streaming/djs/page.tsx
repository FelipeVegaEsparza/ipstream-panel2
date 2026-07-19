'use client'

import { useEffect, useState, useCallback } from 'react'

interface DjSlot {
  id: string
  name: string
  mount: string
  priority: number
  password?: string
  role: 'owner' | 'host' | 'guest'
  isActive: boolean
  connected?: boolean
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Dueño — prioridad máxima, puede interrumpir a todos',
  host: 'Locutor — puede interrumpir a guests, es interrumpido por owner',
  guest: 'Invitado — solo transmite si nadie de mayor prioridad está conectado',
}

const ROLE_HIERARCHY: Record<string, number> = {
  owner: 3,
  host: 2,
  guest: 1,
}

const MOUNTS = ['/dj1', '/dj2', '/dj3', '/dj4']

export default function DJsPage() {
  const [djs, setDjs] = useState<DjSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    mount: '/dj1',
    priority: 1,
    role: 'guest' as string,
    password: '',
  })

  const loadDjs = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/streaming/djs')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setDjs(data.djs || [])
    } catch {
      setError('Error al cargar DJs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadDjs() }, [loadDjs])

  const resetForm = () => {
    setForm({ name: '', mount: '/dj1', priority: 1, role: 'guest', password: '' })
    setEditId(null)
    setShowCreate(false)
  }

  const handleCreate = async () => {
    if (!form.name || !form.password) {
      setError('Nombre y password son requeridos')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/dashboard/streaming/djs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al crear DJ')
      }
      setSuccess(`DJ "${form.name}" creado`)
      resetForm()
      await loadDjs()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (djId: string) => {
    const body: Record<string, any> = {}
    if (form.name) body.name = form.name
    if (form.mount) body.mount = form.mount
    if (form.priority) body.priority = form.priority
    if (form.role) body.role = form.role
    if (form.password) body.password = form.password

    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/dashboard/streaming/djs/${djId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al actualizar DJ')
      }
      setSuccess(`DJ "${form.name}" actualizado`)
      resetForm()
      await loadDjs()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (dj: DjSlot) => {
    if (!confirm(`¿Eliminar el DJ "${dj.name}" (${dj.mount})?`)) return
    try {
      const res = await fetch(`/api/dashboard/streaming/djs/${dj.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error()
      setSuccess(`DJ "${dj.name}" eliminado`)
      await loadDjs()
    } catch {
      setError('Error al eliminar DJ')
    }
  }

  const startEdit = (dj: DjSlot) => {
    setForm({
      name: dj.name,
      mount: dj.mount,
      priority: dj.priority,
      role: dj.role,
      password: '',
    })
    setEditId(dj.id)
    setShowCreate(true)
  }

  const availableMounts = MOUNTS.filter(
    (m) => !djs.some((d) => d.mount === m && d.id !== editId)
  )

  const sortedDjs = [...djs].sort((a, b) => {
    const roleDiff = (ROLE_HIERARCHY[b.role] || 0) - (ROLE_HIERARCHY[a.role] || 0)
    if (roleDiff !== 0) return roleDiff
    return a.priority - b.priority
  })

  if (loading) {
    return <div className="text-gray-400 p-6">Cargando DJs...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">DJs de la Radio</h1>
          <p className="mt-1 text-sm text-gray-400">
            Gestioná hasta 4 slots de DJ. Cada slot tiene su propio password y mountpoint.
            El sistema cambia automáticamente entre DJs según su prioridad y rol.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowCreate(true) }}
          disabled={djs.length >= 4}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm"
        >
          + Nuevo DJ
        </button>
      </div>

      {/* Jerarquía de roles */}
      <div className="bg-gray-800 rounded-lg p-4 text-sm space-y-1">
        <h3 className="font-semibold text-gray-300 mb-2">Jerarquía de roles</h3>
        {Object.entries(ROLE_LABELS).map(([role, desc]) => (
          <div key={role} className="flex items-start gap-2 text-gray-400">
            <span className={`font-medium px-1.5 py-0.5 rounded text-xs uppercase ${
              role === 'owner' ? 'bg-red-900/50 text-red-300' :
              role === 'host' ? 'bg-blue-900/50 text-blue-300' :
              'bg-gray-700 text-gray-300'
            }`}>{role}</span>
            <span>{desc}</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-3 rounded text-sm">{error}</div>
      )}
      {success && (
        <div className="bg-green-900/30 border border-green-700 text-green-200 px-4 py-3 rounded text-sm">{success}</div>
      )}

      {/* Lista de DJs */}
      <div className="space-y-3">
        {sortedDjs.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-500">
            No hay DJs configurados. Creá tu primer slot de DJ para que puedan transmitir en vivo.
          </div>
        ) : sortedDjs.map((dj) => (
          <div key={dj.id} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${dj.connected ? 'bg-green-500 animate-pulse' : dj.isActive ? 'bg-gray-500' : 'bg-red-500'}`} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{dj.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded uppercase ${
                    dj.role === 'owner' ? 'bg-red-900/50 text-red-300' :
                    dj.role === 'host' ? 'bg-blue-900/50 text-blue-300' :
                    'bg-gray-700 text-gray-300'
                  }`}>{dj.role}</span>
                  {dj.connected && <span className="text-xs text-green-400">Conectado</span>}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {dj.mount} · Prioridad: {dj.priority} · {dj.isActive ? 'Activo' : 'Inactivo'}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(dj)} className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded">
                Editar
              </button>
              <button onClick={() => handleDelete(dj)} className="text-xs px-3 py-1.5 bg-red-900/50 hover:bg-red-800 text-red-300 rounded">
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal/Create form */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold text-white">
              {editId ? 'Editar DJ' : 'Nuevo DJ'}
            </h2>

            <div>
              <label className="text-xs text-gray-400 uppercase">Nombre del DJ</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm"
                placeholder="Ej: DJ Alex"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 uppercase">Mountpoint</label>
              <select
                value={form.mount}
                onChange={(e) => setForm({ ...form, mount: e.target.value })}
                className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm"
              >
                {MOUNTS.map((m) => (
                  <option key={m} value={m} disabled={!availableMounts.includes(m) && m !== form.mount}>
                    {m} {!availableMounts.includes(m) && m !== form.mount ? '(ya usado)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 uppercase">Prioridad</label>
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 1 })}
                  className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase">Rol</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm"
                >
                  <option value="owner">Dueño</option>
                  <option value="host">Locutor</option>
                  <option value="guest">Invitado</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 uppercase">
                Password {editId ? '(dejar vacío para mantener)' : ''}
              </label>
              <input
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full mt-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm"
                placeholder={editId ? 'Dejar vacío = mantener actual' : 'Password para conectar'}
                type="password"
              />
            </div>

            {form.role && (
              <div className="text-xs text-gray-500 bg-gray-900 rounded p-2">
                {ROLE_LABELS[form.role]}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { resetForm(); setShowCreate(false) }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => editId ? handleUpdate(editId) : handleCreate()}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded text-sm"
              >
                {saving ? 'Guardando...' : editId ? 'Guardar cambios' : 'Crear DJ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {success && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg">
          ✓ {success}
        </div>
      )}
    </div>
  )
}
