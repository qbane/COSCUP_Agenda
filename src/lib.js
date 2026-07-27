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

    let allTags = programs.tags.filter(tag => tag.id.trim()); // tags contain a `" "` element...
    allTags = allTags.filter(tag => tag.id.startsWith('language_')).concat(
      allTags.filter(tag => !tag.id.startsWith('language_')))

    let firstFuture = true;
    const talks = programs.sessions
      .filter(t => t.room == roomId)
      .map(t => ({
        ...t,
        beginMoment: moment(t.start),
        endMoment: moment(t.end),
        type: programs.session_types
          .filter(type => type.id == t.type),
        tags: allTags
          .filter(tag => t.tags.indexOf(tag.id) >= 0)
          .map(tag => tag.zh.name.trim()),
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

  const strayRoomIds = Array.from(new Set(tracksWithTalks.map(x => x.roomId)).difference(new Set(sortedRoomIds)))

  if (strayRoomIds.length) {
    console.warn('Found stray room ids', strayRoomIds)
  }

  const sortedTracksWithTalks = tracksWithTalks.sort((a, b) => {
    let aa = sortedRoomIds.indexOf(a.roomId)
    let bb = sortedRoomIds.indexOf(b.roomId)
    if (aa < 0) aa = 1e9
    if (bb < 0) bb = 1e9
    return aa - bb || a.roomId.localeCompare(b)
  })

  const speakersById = Object.fromEntries(programs.speakers.map(sp => [sp.id, sp]));

  window.speakersById = speakersById;
  agendaView.updateTracks(today, sortedTracksWithTalks, speakersById, roomIdsByFloors, programs.__timestamp__);
}
