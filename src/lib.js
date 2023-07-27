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

    let priorityTags = [
      'mandarin', 'english', 'taiwanese', 'japanese', // langauges
      'beginner', 'skilled', 'advanced', 'workshop', // levels
    ];

    let allTags = programs.tags.filter(tag => tag.id.trim()); // tags contain a `" "` element...
    allTags = allTags.filter(tag => priorityTags.indexOf(tag.id) >= 0).concat(
      allTags.filter(tag => priorityTags.indexOf(tag.id) < 0))

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
    return {
      roomName: room.zh.name,
      roomId: roomId,
      talks,
      hasNextOrOngoing: (talks.filter(t => t.isOngoing || t.isNext).length > 0),
    };
  }).filter(t => t.talks.length);

  // COSCUP 2023
  const sortedRoomIds = [
    'RB105', 'AU101',
    'TR209', 'TR211', 'TR212', 'TR213', 'TR214',
    'TR310-1', 'TR310-2', 'TR311', 'TR313',
    'TR409-1', 'TR409-2', 'TR410', 'TR411', 'TR412-1', 'TR412-2', 'TR413-1', 'TR413-2',
    'TR510'
  ];
  const sortedTracksWithTalks = tracksWithTalks.sort((a, b) =>
    (sortedRoomIds.indexOf(a.roomId) - sortedRoomIds.indexOf(b.roomId)));

  let speakersById = {};
  programs.speakers.forEach(speaker => {
    speakersById[speaker.id] = speaker;
  });

  window.speakersById = speakersById;
  agendaView.updateTracks(today, sortedTracksWithTalks, speakersById);
}
