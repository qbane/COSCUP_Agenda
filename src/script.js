import Vue from 'vue'
import Agenda from './components/Agenda.vue'

Vue.directive('swipeleft', {
  bind: function(el, binding, vnode) {
    let startX, startPageTop, originLeft, starredYet;

    const onSwipeStart = evt => {
      el.classList.add('swipe-x');
      startX = (evt.changedTouches && evt.changedTouches[0].pageX) || evt.pageX;
      startPageTop = window.scrollY;
      originLeft = el.style.left || null;
      starredYet = el.classList.contains('starred');
    };

    const onSwipeMove = evt => {
      if (!el.classList.contains('swipe-x')) return;
      const eventX = (evt.changedTouches && evt.changedTouches[0].pageX) || evt.pageX;
      const offsetX = (eventX - startX);
      const diffPageTop = Math.abs(window.scrollY - startPageTop);
      if (offsetX >= -40 || diffPageTop > 0) {
        el.style.left = '0';
      }
      else {
        el.style.left = `${Math.max(offsetX, -120)}px`;
        evt.preventDefault();
      }
      if (offsetX <= -80 && diffPageTop <= 0) {
        el.classList[starredYet ? 'remove' : 'add']('starred');
      }
    };

    const onSwipeStop = evt => {
      if (!el.classList.contains('swipe-x')) return;
      el.classList.remove('swipe-x');
      el.style.left = originLeft;

      const eventX = (evt.changedTouches && evt.changedTouches[0].pageX) || evt.pageX;
      const offsetX = (eventX - startX);
      const diffPageTop = Math.abs(window.scrollY - startPageTop);
      if (offsetX <= -80 && diffPageTop <= 60) {
        binding.value(evt);
      }
    };

    el.addEventListener('touchstart', onSwipeStart, false);
    el.addEventListener('touchmove', onSwipeMove, false);
    el.addEventListener('touchend', onSwipeStop, false);

    el.addEventListener('mousedown', onSwipeStart, false);
    el.addEventListener('mousemove', onSwipeMove, false);
    el.addEventListener('mouseup', onSwipeStop, false);
    el.addEventListener('mouseleave', onSwipeStop, false);
  },
});

const agendaView = new Vue({
  setup: Agenda.setup,
  render: Agenda.render,
  data: {
    today: moment().format('YYYYMMDD'),
    tracks: [],
    nextOnly: false,
    starredOnly: false,
    timeMachine: false,
    timeMachineValue: 0,
    starreds: JSON.parse(localStorage.getItem('starreds') || '[]'),
    lastUpdate: moment(0),
    online: window.navigator.onLine,
  },
  computed: {
    timeMachineTime: function() {
      return moment(this.today).startOf('day').add(this.timeMachineValue, 'minutes');
    },
  },
  methods: {
    updateTracks: function(today, tracks, speakersById) {
      this.today = today;
      this.tracks = tracks;
      this.speakersById = speakersById;
      this.lastUpdate = moment();
    },

    toggleTalkDetails: function(evt) {
      if (evt) {
        evt.currentTarget.classList.toggle('display-details');
      }
    },

    toggleNextOnly: function() {
      this.nextOnly = !this.nextOnly;
      if (this.nextOnly) this.starredOnly = false;
    },

    toggleStarredOnly: function() {
      this.starredOnly = !this.starredOnly;
      if (this.starredOnly) this.nextOnly = false;
    },

    toggleTimeMachine: function() {
      this.timeMachine = !this.timeMachine;
      this.timeMachineValue = this.timeMachineValue || moment().diff(moment().startOf('day'), 'minutes');
      this.timeMachine ? timeMachineJump() : timeMachineStop();
    },

    toggleTalkStarred: function(evt) {
      if (evt) {
        const talkId = evt.currentTarget.getAttribute('data-talk-id');
        if (talkId) {
          const index = this.starreds.indexOf(talkId);
          if (index >= 0) {
            this.starreds.splice(index, 1);
            localStorage.setItem('starreds', JSON.stringify(this.starreds));
            console.log(`removed ${talkId}`);
          }
          else {
            this.starreds.push(talkId);
            localStorage.setItem('starreds', JSON.stringify(this.starreds));
            console.log(`added ${talkId}`);
          }
        }
      }
    },

    setOnline: function(isOnline) {
      this.online = isOnline;
    },
  },
});

agendaView.$mount(document.getElementById('app'))

// this should be put into agendaView ?
function updateTracks(programs) {
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

let tmTimer = undefined;
function timeMachineJumpThrottled() {
  if (!tmTimer) {
    tmTimer = setTimeout(function() {
      timeMachineJump();
      tmTimer = undefined;
    }, 100);
  }
}

function timeMachineJump() {
  updateTracks(window.programs);
}

function timeMachineStop() {
  updateTracks(window.programs);
}

const programsUri = 'https://coscup.org/2023/json/session.json';

let hashChangeEvt = undefined;
let refreshInterval = undefined;
function onProgramsUpdated(programs) {
  window.programs = programs;
  updateTracks(programs);
  if (hashChangeEvt) window.removeEventListener('hashchange', hashChangeEvt);
  hashChangeEvt = window.addEventListener('hashchange', () => {
    if (agendaView.timeMachine) agendaView.toggleTimeMachine();
    updateTracks(programs);
  }, false);
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(() => updateTracks(programs), 60000);
}

function reloadPrograms(forced) {
  const uri = programsUri + (forced ? ('?' + (new Date().getTime())) : '');
  fetch(uri).then(r => r.json()).then(programs => {
    localStorage.setItem('programs', JSON.stringify(programs));
    onProgramsUpdated(programs);
  });
}

const cachedPrograms = localStorage.getItem('programs');
if (cachedPrograms) {
  const programs = JSON.parse(cachedPrograms);
  onProgramsUpdated(programs);
}
else {
  reloadPrograms();
}

if (!window.location.hash) {
  window.location.hash = '#20230729';
}

if (process.env.NODE_ENV !== 'development') {
  if (window.navigator.serviceWorker) {
    window.navigator.serviceWorker
      .register('service_worker.js')
      .then(reg => {
        console.log(reg.scope);
        window.serviceWorkerReg = reg;
      });
  }
} else {
  console.debug('Ignoring service worker in development mode')
}

function purgeOfflineData() {
  if (!window.navigator.onLine) return;

  localStorage.removeItem('programs');
  console.log('Removed cached programs');

  const channel = new MessageChannel();
  channel.port1.onmessage = evt => {
    if (evt.data.ok) {
      console.log('Confirmed caches purged');
      window.serviceWorkerReg.update().then(() => {
        window.location.reload();
      });
    }
  };
  window.navigator.serviceWorker.controller.postMessage({
    action: 'purgeCache',
  }, [channel.port2]);
}

window.addEventListener('online', () => agendaView.setOnline(true));
window.addEventListener('offline', () => agendaView.setOnline(false));
