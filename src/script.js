import Vue from 'vue'
import Agenda from './components/Agenda.vue'

import {
  timeMachineJump,
  timeMachineJumpThrottled,
  timeMachineStop,
  updateTracks,
} from './lib'

const libFuncs = {
  timeMachineJump,
  timeMachineJumpThrottled,
  timeMachineStop,
  reloadPrograms,
}

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

export const agendaView = new Vue({
  setup: Agenda.setup,
  render: Agenda.render,
  data: {
    currentTheme: document.querySelector('html').classList.contains('dark') ? 'dark' : 'light',
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
    currentThemeText: function() {
      return this.currentTheme == 'dark' ? '🌙' : '☀️'
    },
    timeMachineTime: function() {
      return moment(this.today).startOf('day').add(this.timeMachineValue, 'minutes');
    },
  },
  methods: {
    toggleTheme: function() {
      if (this.currentTheme == 'dark') {
        this.currentTheme = 'light'
      } else {
        this.currentTheme = 'dark'
      }
      localStorage.theme = this.currentTheme
      __set_theme__(this.currentTheme)
    },

    updateTracks: function(today, tracks, speakersById, ts = undefined) {
      this.today = today;
      this.tracks = tracks;
      this.speakersById = speakersById;
      this.lastUpdate = moment(ts);
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

    ...libFuncs,
  },
});

agendaView.$mount(document.getElementById('app'))


const programsUri = `https://coscup.org/${import.meta.env.COSCUP_AGENDA_YEAR}/json/session.json`;

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

export function reloadPrograms(forced) {
  const uri = programsUri + (forced ? ('?' + (new Date().getTime())) : '');
  fetch(uri).then(r => r.json()).then(programs => {
    programs.__timestamp__ = Date.now()
    localStorage.setItem('programs', JSON.stringify(programs));
    onProgramsUpdated(programs);
  });
}

const cachedPrograms = localStorage.getItem('programs');
if (cachedPrograms) {
  const programs = JSON.parse(cachedPrograms);
  if (programs.__timestamp__ === undefined) {
    // un-patched object
    programs.__timestamp__ = Date.now();
    localStorage.setItem('programs', JSON.stringify(programs));
  }
  onProgramsUpdated(programs);
}
else {
  reloadPrograms();
}

if (!window.location.hash) {
  window.location.hash = import.meta.env.COSCUP_AGENDA_DATE_D1;
}

if (process.env.NODE_ENV !== 'development') {
  if (window.navigator.serviceWorker) {
    const serviceWorkerUrl = '/service_worker.js';
    window.navigator.serviceWorker
      .register(serviceWorkerUrl)
      .then(reg => {
        console.log('Registered service worker', reg.scope);
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

  function afterPurgeComplete() {
    window.location.reload();
  }

  const swController = window.navigator.serviceWorker.controller;
  if (swController) {
    console.log('Notifying service worker to purge cache...');
    const channel = new MessageChannel();
    channel.port1.onmessage = evt => {
      if (evt.data.ok) {
        console.log('Confirmed caches purged');
        window.serviceWorkerReg.update().then(afterPurgeComplete);
      }
    };
    swController.postMessage({
      action: 'purgeCache',
    }, [channel.port2]);
  } else {
    console.log('No service worker detected; refreshing soon...');
    setTimeout(afterPurgeComplete, 250);
  }
}

window.purgeOfflineData = purgeOfflineData

window.addEventListener('online', () => agendaView.setOnline(true));
window.addEventListener('offline', () => agendaView.setOnline(false));
