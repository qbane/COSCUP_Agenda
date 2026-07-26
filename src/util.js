export const envYear = Number.parseInt(import.meta.env.COSCUP_AGENDA_YEAR)
export const urlBase = `https://coscup.org/${envYear}`

export const programsUri = envYear <= 2025 ?
  `${urlBase}/json/session.json` :
  `${urlBase}/api/session`
  // XXX: have you considered https://pretalx.coscup.org/coscup-2026/schedule/v/999/widgets/schedule.json

// COSCUP 2026
export const roomNamesByFloors = [
  ['1F', ['RB105', 'RB101', 'RB102', 'AU']],
  ['2F', ['TR209', 'TR210', 'TR211', 'TR212', 'TR213', 'TR214']],
  ['3F', ['TR310-2', 'TR311', 'TR313', 'Hallway outside TR309']],
  ['4F', ['TR409-2', 'TR410', 'TR411', 'TR412-1', 'TR412-2', 'Hallway outside TR409']],
  ['5F', ['TR509', 'TR510', 'TR511', 'TR512', 'TR513', 'TR514', 'TR515']],
];

/**
 * @template T
 * @type {<T>(x: T) => T} */
const id = x => x

/**
 * @param {string} data
 * @param {number} year */
export function parsePrograms(data, year) {
  const transform = year <= 2025 ? id : transformNuxtApiPayload
  return transform(JSON.parse(data))
}

/** @param {Record<string, unknown>} data */
function transformNuxtApiPayload(data) {
  return new ProgramsBuilder2026(Object.values(data).flat()).dump()
}

function translateTag(key) {
  const mapping = {
    'Elementary': '入門',
    'Intermediate': '中階',
    'Advanced': '進階',
  }
  const name = mapping[key] ?? key
  return {
    id: key,
    zh: {name},
    en: {name},
  }
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
    function fixupRoomName(name) {
      return name.replace(/^Hallway outside (.+)/, '$1 外走廊')
    }

    for (const prog of this.programs) {
      const { speakers, track, room, tags, ...rest } = prog

      const speakers_ = prog.speakers.map(x => this.speakers.upsert({
        ...x,
        avatar: x.avatar ?? '',
      }))
      const session_type = this.session_types.upsert({
        id: prog.track.id,
        zh: {name: prog.track.name['zh-hant'] || prog.track.name['en']},
        en: {name: prog.track.name['en']},
        link: `${urlBase}/track/${prog.track.id}`,
      })
      const room_ = this.rooms.upsert({
        id: prog.room.en,
        zh: {name: fixupRoomName(prog.room.en)},
        en: {name: prog.room.en},
      })
      const tags_ = prog.tags.map(x => this.tags.upsert(translateTag(x)))
      tags_.push(this.tags.upsert({
        id: prog.en.type,
        en: {name: prog.en.type},
        zh: {name: prog.zh.type},
      }))


      this.sessions.push({
        ...rest,

        //                                               vvvvvvvv---- why?
        zh: { title: prog.zh.title, description: prog.zh.describe },
        en: { title: prog.en.title, description: prog.en.describe },

        speakers: speakers_,
        type: [session_type],
        room: room_,
        tags: tags_,
      })
    }

    const data = Object.assign({ sessions: this.sessions }, Object.fromEntries(
        ['speakers', 'session_types', 'rooms', 'tags'].map(
            x => [x, this[x].toJSON()])))

    return data
  }
}
