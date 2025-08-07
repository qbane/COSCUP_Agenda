import { agendaView } from './script'

let tmTimer = undefined;
export function timeMachineJumpThrottled() {
  if (!tmTimer) {
    tmTimer = setTimeout(function() {
      timeMachineJump();
      tmTimer = undefined;
    }, 100);
  }
}

export function timeMachineJump() {
  updateTracks(window.programs);
}

export function timeMachineStop() {
  updateTracks(window.programs);
}

const predefinedLangs = {
  Mandarin: '漢語',
  English: '英語',
  Japanese: '日語',
  'Taiwan Taigi': '臺語',
}

function getLanguageTrans(la) {
  if (predefinedLangs[la]) return predefinedLangs[la]
  return la.length > 30 ? la.slice(0, 30) + '...' : la
}

// this should be put into agendaView ?
export function updateTracks(programs) {
  let today = moment().format('YYYYMMDD');
  if (window.location.hash) {
    const timestamp = window.location.hash.substring(1);
    today = moment(timestamp).format('YYYYMMDD');
  }

  let now = moment();
  if (agendaView.timeMachine) {
    now = agendaView.timeMachineTime;
  }
  else if (now.format('YYYYMMDD') != today) {
    now = moment(0);
  }

  const tracksWithTalks = programs.rooms.map(room => {
    const roomId = room.id;

    // not used in 2025
    // const priorityTags = [
    //   'mandarin', 'english', 'taiwanese', 'japanese', // langauges
    //   'beginner', 'skilled', 'advanced', 'workshop', // levels
    // ];

    let allTags = programs.tags.filter(tag => tag.id.trim()); // tags contain a `" "` element...
    allTags = allTags.filter(tag => tag.id.startsWith('language_')).concat(
      allTags.filter(tag => !tag.id.startsWith('language_')))

    // make a pseudo tag if it does not exist
    function ensureLanguageTag(tagpairs, lang) {
      if (!tagpairs.some(([id, tag]) => id.startsWith('language_'))) {
        tagpairs.splice(0, 0, ['', getLanguageTrans(lang)])
      }
      return tagpairs.map(([x, y]) => y)
    }

    let firstFuture = true;
    const talks = programs.sessions
      .filter(t => t.room == roomId)
      .map(t => ({
        ...t,
        beginMoment: moment(t.start),
        endMoment: moment(t.end),
        type: programs.session_types
          .filter(type => type.id == t.type)
          .map(type => type.zh.name),
        tags: ensureLanguageTag(
          allTags
            .filter(tag => t.tags.indexOf(tag.id) >= 0)
            .map(tag => [tag.id, tag.zh.name.trim()]),
          t.language),
      }))
      .filter(t => t.beginMoment.format('YYYYMMDD') == today)
      .sort((a, b) => (a.beginMoment - b.beginMoment))
      .map((t, index, talks) => {
        let isNext = false;
        if ((t.beginMoment > now) && firstFuture) {
          firstFuture = false;
          isNext = true;
        }
        return {
          ...t,
          isExpired: (t.endMoment < now),
          isOngoing: (t.beginMoment <= now && t.endMoment >= now),
          isNext: isNext,
        };
      });
    return {
      roomName: room.zh.name,
      roomId: roomId,
      talks,
      hasNextOrOngoing: (talks.filter(t => t.isOngoing || t.isNext).length > 0),
    };
  }).filter(t => t.talks.length);

  // COSCUP 2025
  const roomNamesByFloors = [
    ['1F', ['RB105', 'AU', 'RB101', 'RB102']],
    ['2F', ['TR209', 'TR210', 'TR211', 'TR212', 'TR213', 'TR214']],
    ['3F', ['Hallway outside TR309', 'TR310-2', 'TR311', 'TR313']],
    ['4F', ['Hallway outside TR409', 'TR409-2', 'TR410', 'TR411', 'TR412-1', 'TR412-2']],
    ['5F', ['TR509', 'TR510', 'TR511', 'TR512', 'TR513', 'TR514', 'TR515']],
    ['6F', ['TR6F']],
  ];

  const roomNameToId = Object.fromEntries(programs.rooms.map(({id, en:{name}}) => [name, id]))
  const roomIdsByFloors = roomNamesByFloors.map(([f, names]) => [f, names.map(name => roomNameToId[name])])

  const sortedRoomIds = roomIdsByFloors.map(([, snd]) => snd).flat()

  const sortedTracksWithTalks = tracksWithTalks.sort((a, b) =>
    (sortedRoomIds.indexOf(a.roomId) - sortedRoomIds.indexOf(b.roomId)));

  const speakersById = Object.fromEntries(programs.speakers.map(sp => [sp.id, sp]));

  window.speakersById = speakersById;
  agendaView.updateTracks(today, sortedTracksWithTalks, speakersById, roomIdsByFloors, programs.__timestamp__);
}
