import type { DeclarationTypeConfig, DeclarationTypeKey } from '../../shared/types'

// ═══ Declaration Type Registry ═══
// Each type defines which universal fields to show, their labels, required/optional, and validation rules.

const registry = new Map<DeclarationTypeKey, DeclarationTypeConfig>()

export function registerType(config: DeclarationTypeConfig): void {
  registry.set(config.type, config)
}

export function getType(type: DeclarationTypeKey): DeclarationTypeConfig | undefined {
  return registry.get(type)
}

export function getAllTypes(): DeclarationTypeConfig[] {
  return Array.from(registry.values())
}

export function getTypeLabels(): { key: DeclarationTypeKey; title: string; description: string }[] {
  return getAllTypes().map(t => ({ key: t.type, title: t.title, description: t.description }))
}

// Auto-register all types on import
import './import-declaration'
import './export-declaration'
import './inbound-filing-list'
import './outbound-filing-list'
import './transit-transport'
import './verification-list'
import './consolidated-list'
