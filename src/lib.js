import { agendaView } from './script'
import { roomNamesByFloors } from './util'

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
          .filter(type => type.id == t.type),
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

    const roomTracks = Array.from(new Set(talks.map(t => t.type[0])))
    return {
      roomName: room.zh.name,
      roomId: roomId,
      roomTracks,
      talks,
      hasNextOrOngoing: (talks.filter(t => t.isOngoing || t.isNext).length > 0),
    };
  }).filter(t => t.talks.length);


  const roomNameToId = Object.fromEntries(programs.rooms.map(({id, en:{name}}) => [name, id]))
  const roomIdsByFloors = roomNamesByFloors.map(([f, names]) => [f, names.map(name => roomNameToId[name])])

  const sortedRoomIds = roomIdsByFloors.map(([, snd]) => snd).flat()

  const sortedTracksWithTalks = tracksWithTalks.sort((a, b) =>
    (sortedRoomIds.indexOf(a.roomId) - sortedRoomIds.indexOf(b.roomId)));

  const speakersById = Object.fromEntries(programs.speakers.map(sp => [sp.id, sp]));

  window.speakersById = speakersById;
  agendaView.updateTracks(today, sortedTracksWithTalks, speakersById, roomIdsByFloors, programs.__timestamp__);
}
