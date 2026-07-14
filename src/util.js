import { parse as devalueParse } from 'devalue'

export const envYear = Number.parseInt(import.meta.env.COSCUP_AGENDA_YEAR)
export const urlBase = `https://coscup.org/${envYear}`

// COSCUP 2026
export const roomNamesByFloors = [
  ['1F', ['RB105', 'RB101', 'RB102', 'AU']],
  ['2F', ['TR209', 'TR210', 'TR211', 'TR212', 'TR213', 'TR214']],
  ['3F', ['TR310-2', 'TR311', 'TR313']],
  ['4F', ['TR409-2', 'TR410', 'TR411', 'TR412-1', 'TR412-2']],
  ['5F', ['TR510', 'TR511', 'TR512', 'TR513', 'TR514', 'TR515']],
];

/**
 * @param {string} data
 * @param {number} year */
export function parsePrograms(data, year) {
  if (year <= 2025) {
    return JSON.parse(data)
  }
  return parseNuxtPayload2026(data)
}

/** @param {string} data */
function parseNuxtPayload2026(data) {
  const obj = devalueParse(data, {
    ShallowReactive: x => x,
  })

  /* shape:
    Object {
      data: Object {
        $fwuenr1OZcDw8TjcC-BzsU1lhSGBFolBhwdGCSmwMXKw:
          Array(9) [Object, Object, Object, Object, Object, Object, Object, Object, Object]
        $ftoUUvay03wjsVvLRB4QkJLEjxwDkVF3M27glSEGre1w:
          Object {2026-08-08: Array(167), 2026-08-09: Array(166)}
    }
      prerenderedAt: 1783996252604
    }
  */

  const cands = Object.values(obj.data).filter(x => !Array.isArray(x))

  if (cands.length !== 1) {
    throw new Error(`Failed to lookup program from Nuxt payload: ${JSON.stringify(obj)}`)
  }

  return new ProgramsBuilder2026(Object.values(cands[0]).flat()).dump()
}

class Store {
  constructor(getKey) {
    this.getKey = getKey ?? (x => x.id)
    this.store = new Map()
  }
  upsert(data) {
    const k = this.getKey(data)
    if (this.store.has(k)) return k
    this.store.set(k, data)
    return k
  }
  toJSON() {
    return Array.from(this.store.values())
  }
}

class ProgramsBuilder2026 {
  constructor(programs) {
    this.programs = programs

    this.sessions = []
    this.speakers = new Store()
    this.session_types = new Store()
    this.rooms = new Store()
    this.tags = new Store()
  }

  dump() {
    for (const prog of this.programs) {
      const speakers = prog.speakers.map(x => this.speakers.upsert({
        ...x,
        avatar: x.avatar ?? '',
      }))
      const session_type = this.session_types.upsert({
        id: prog.track.id,
        zh: {name: prog.track.name['zh-hant'] || prog.track.name['en']},
        en: {name: prog.track.name['en']},
        link: `${urlBase}/track/${prog.track.id}`,
      })
      const room = this.rooms.upsert({
        id: prog.room.en,
        zh: {name: prog.room.en},
        en: {name: prog.room.en}
      })
      const tags = prog.tags.map(x => this.tags.upsert({
        id: x,
        zh: {name: x},
        en: {name: x},
      }))
      tags.push(this.tags.upsert({
        id: prog.en.type,
        zh: {name: prog.zh.type},
        en: {name: prog.en.type},
      }))

      this.sessions.push({
        ...prog,

        zh: { ...prog.zh, description: prog.zh.describe },
        en: { ...prog.en, description: prog.en.describe },

        speakers,
        type: [session_type],
        room,
        tags,
      })
    }

    const data = Object.assign({ sessions: this.sessions }, Object.fromEntries(
        ['speakers', 'session_types', 'rooms', 'tags'].map(
            x => [x, this[x].toJSON()])))

    return data
  }
}
