<script setup>
  const console = globalThis.console
  const ENV_D1 = import.meta.env.COSCUP_AGENDA_DATE_D1
  const ENV_D2 = import.meta.env.COSCUP_AGENDA_DATE_D2
</script>

<template>
<div id="agenda">
  <nav>
    <a :href="'#' + ENV_D1" v-bind:class="{ active: (today == ENV_D1) }">D1</a>
    <a :href="'#' + ENV_D2" v-bind:class="{ active: (today == ENV_D2) }">D2</a>
    <a v-on:click.prevent="toggleNextOnly" v-bind:class="{ active: nextOnly }">找</a>
    <a v-on:click.prevent="toggleStarredOnly" v-bind:class="{ active: starredOnly }">星</a>
    <a v-on:click.prevent="toggleTimeMachine" v-bind:class="{ active: timeMachine }">跳</a>
    <a style="font-weight:bold" v-on:click.prevent="reloadPrograms(true)">更</a>
    <a void id="theme-toggler" v-on:click.prevent="toggleTheme">{{ currentThemeText }}</a>
    <select id="quick-navigator" v-on:change="navigateToTrack">
      <option value="" selected>⏩</option>
      <option value="__top__">🔼</option>
      <option v-for="[floorName, roomIds] in roomIdsByFloors" v-bind:disabled="roomIds.every(id => !trackToVisibility[id])" v-bind:value="floorName">{{ floorName }}</option>
      <option value="__bottom__">🔽</option>
    </select>
  </nav>

  <div class="time-machine" v-if="timeMachine">
    時光機 ▸ {{ timeMachineTime.format('MM 月 DD 日 HH 時 mm 分') }}
    <input type="range" min="510" max="1200" v-model="timeMachineValue"
      v-on:change="timeMachineJump" v-on:input="timeMachineJumpThrottled">
  </div>

  <div class="no-talks" v-if="nextOnly && tracks.every(t => !t.hasNextOrOngoing)">
    <span style="font-size:20pt;">😴😴😴</span><br>
    這個時段沒有議程了
  </div>

  <div class="no-talks" v-if="starredOnly && tracks.every(track => (track.talks.filter(t => starreds.indexOf(t.id) >= 0).length == 0))">
    <span style="font-size:20pt;">🧐🧐🧐</span><br>
    您尚未標註任何議程<br>
    試試看在議程上往左滑動來標註！
  </div>

  <div class="track" v-for="track in tracks" v-if="trackToVisibility[track.roomId]">
    <h2 class="track-title" v-bind:data-floor-id="roomIdsByFloors.map(([fid, arr]) => arr.includes(track.roomId) && fid).filter(x => x !== false)[0]">{{ track.roomName }}</h2>
    <div class="talks" v-bind:class="{ nextOnly: nextOnly, starredOnly: starredOnly }">
      <div class="talk" v-for="(talk, index) in track.talks"
        v-bind:class="{ expired: talk.isExpired, ongoing: talk.isOngoing, next: talk.isNext,
          starred: (starreds.indexOf(talk.id) >= 0) }"
        v-on:click="console.dir(talk);/*for debugging*/"
        v-on:mouseup.stop="toggleTalkDetails"
        v-swipeleft.stop="toggleTalkStarred"
        v-bind:data-talk-id="talk.id">
        <div style="white-space:nowrap;overflow:hidden;display:flex;align-items:center;gap:8px">
          <span class="talk-time">{{ talk.beginMoment.format('HH:mm') }}–{{ talk.endMoment.format('HH:mm') }}</span>
          <div class="talk-meta-info">
            <span class="talk-type" v-if="talk.type.length">{{ talk.type[0] }}</span>
            <span class="talk-tags" v-if="talk.tags.length">
              <span class="talk-tag" v-for="tag in talk.tags">{{ tag }}</span>
            </span>
          </div>
          <a class="talk-permalink" v-bind:href="talk.uri" target="_blank" v-on:mouseup.stop>🌐</a>
        </div>
        <div style="margin:3pt 0;" v-if="!talk.expire"></div>
        <span class="talk-title">{{ talk.zh.title }}</span>
        <span class="talk-speakers" v-if="talk.speakers.length">
          <span class="paren">(</span><!--
          --><template v-for="(s, index) in talk.speakers.map(speakerId => speakersById[speakerId])"><!--
          --><template v-if="index > 0">, </template><!--
          --><img class="talk-speakers-avatar" v-if="s.avatar" v-bind:src="s.avatar"><!--
          -->{{ s.zh.name }}<!--
          --></template><!--
          --><span class="paren">)</span>
        </span>
        <div class="talk-intro" v-if="talk.zh.description">
          <span v-html="talk.zh.description.replace(/(\r?\n)+/g, '&lt;br>')"></span>
        </div>
        <div class="talk-speaker-intros">
            <div v-if="talk.speakers.every(speakerId => !speakersById[speakerId]?.zh?.bio)" class="talk-speaker-intro" style="opacity: .5">
            講者資訊留白
          </div>
          <div class="talk-speaker-intro"
            v-for="speaker in talk.speakers.map(speakerId => speakersById[speakerId]).filter(s => s)"
            v-if="speaker.zh.bio">
            <span class="talk-speaker-intro-speaker">{{ speaker.zh.name }}</span> ▸ <span v-html="speaker.zh.bio.replace(/(\r?\n)+/g, '&lt;br>')"></span>
          </div>
          <div class="talk-meta-links">
            <a v-on:mouseup.stop v-if="talk.co_write" target="_blank" v-bind:href="talk.co_write">⧉共筆</a>
            <a v-on:mouseup.stop v-if="talk.qa" target="_blank" v-bind:href="talk.qa">⧉Q & A</a>
            <a v-on:mouseup.stop v-if="talk.slide" target="_blank" v-bind:href="talk.slide">⧉投影片</a>
            <a v-on:mouseup.stop v-if="talk.record" target="_blank" v-bind:href="talk.record">⧉記錄</a>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="last-update" v-bind:class="{ online: this.online, offline: !this.online  }">
    議程表最近同步：{{ this.lastUpdate.format('YYYY/MM/DD HH:mm:ss') }}
  </div>
</div>
</template>
