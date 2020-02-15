<template>
    <div id="wrapper">
        <div id="top">
          <div class="input-group mb-3">
            <div class="input-group-prepend">
              <label class="input-group-text" for="shutdownTimeSelect">Time options</label>
            </div>
            <select class="custom-select" id="shutdownTimeSelect">
              <option value="1">Time when to shutdown</option>
              <option value="2">Time until shutdown</option>
            </select>
          </div>
          <div class="input-group mb-3">
            <div class="input-group-prepend">
              <label class="input-group-text" for="shutdownCommandSelect">Shutdown options</label>
            </div>
            <select class="custom-select" id="shutdownCommandSelect">
              <option value="1">Shutdown</option>
              <option value="2">Hibernate</option>
            </select>
          </div>
          <div class="input-group">
            <input id="limitHours" type="text" class="form-control" placeholder="Hours" onClick="this.select();">
            <input id="limitMinutes" type="text" class="form-control" placeholder="Minutes" onClick="this.select();">
            <div class="input-group-append">
              <input class="btn btn-outline-primary" type="button" value="Activate" @click="countDown">
              <input class="btn btn-outline-secondary" type="button" value="Cancel" @click="cancel">
            </div>
          </div>
        </div>
        <div class="bottom" id="bottom">
          <div id="text"></div>
          <div class="time" id="time"></div>
        </div>
    </div>
</template>

<script>
import { ipcRenderer } from 'electron'

export default {
  name: 'countdown-page',
  components: {
  },
  data () {
    return {}
  },
  methods: {
    // Restricts input for the given textbox to the given inputFilter.
    setInputFilter (textbox, inputFilter) {
      ['input', 'keydown', 'keyup', 'mousedown', 'mouseup', 'select', 'contextmenu', 'drop'].forEach(
        function (event) {
          textbox.addEventListener(event, function () {
            if (inputFilter(this.value)) {
              this.oldValue = this.value
              this.oldSelectionStart = this.selectionStart
              this.oldSelectionEnd = this.selectionEnd
            } else if (this.hasOwnProperty('oldValue')) {
              this.value = this.oldValue
              this.setSelectionRange(this.oldSelectionStart, this.oldSelectionEnd)
            } else {
              this.value = ''
            }
          })
        }
      )
    },
    enteredTimeIsValid () {
      let shutdownTimeSelect = document.querySelector('select#shutdownTimeSelect').value
      if (document.querySelector('input#limitHours').value === '' && shutdownTimeSelect !== '2') {
        document.querySelector('div#text').innerHTML = 'Please enter hours'
        return false
      }
      if (document.querySelector('input#limitMinutes').value === '') {
        document.querySelector('div#text').innerHTML = 'Please enter minutes'
        return false
      }

      return true
    },
    getCountDownTimer () {
      let shutdownTimeSelect = document.querySelector('select#shutdownTimeSelect').value
      let countDownTimer = new Date()
      let hours = Number(document.querySelector('input#limitHours').value)
      let minutes = Number(document.querySelector('input#limitMinutes').value)
      if (shutdownTimeSelect === '2') {
        hours = countDownTimer.getHours() + hours
        minutes = countDownTimer.getMinutes() + minutes
      }
      if (hours < countDownTimer.getHours() && hours > 0) {
        countDownTimer.setDate(countDownTimer.getDate() + 1)
      }
      countDownTimer.setHours(hours, minutes)

      return countDownTimer
    },
    cancel () {
      clearInterval(this.interval)
      document.querySelector('div#text').innerHTML = ''
      document.querySelector('div#time').innerHTML = ''
      ipcRenderer.send('request-mainprocess-action', {'shutdown': 'cancel'})
    },
    countDown () {
      if (!this.enteredTimeIsValid()) {
        return
      }

      let timeUntilString = `Time until shutdown:`
      document.querySelector('div#text').innerHTML = timeUntilString

      let countDownTimer = this.getCountDownTimer()
      this.displayTimer(countDownTimer - new Date().getTime())

      let shutdownCommandSelection = document.querySelector('select#shutdownCommandSelect').value
      let shutdownCommands = {
        '1': 'shutdown',
        '2': 'hibernate'
      }
      this.interval = setInterval(() => {
        let difference = countDownTimer - new Date().getTime()

        this.displayTimer(difference)

        if (difference < 1) {
          clearInterval(this.interval)
          console.log('SHUTDOWN!!!')
          document.querySelector('div#text').innerHTML = 'SHUTDOWN!!!'
          document.querySelector('div#time').innerHTML = ''
          ipcRenderer.send('request-mainprocess-action', {'shutdown': shutdownCommands[shutdownCommandSelection]})
        }
      }, 1001)
    },
    displayTimer (difference) {
      let hours = this.calculateHours(difference)
      let minutes = this.calculateMinutes(difference)
      let seconds = this.calculateSeconds(difference)

      let timeString = `${hours}:${minutes}:${seconds}`

      console.log(timeString)

      document.querySelector('div#time').innerHTML = timeString
    },
    calculateHours (difference) {
      return this.formatNumber(Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)))
    },
    calculateMinutes (difference) {
      return this.formatNumber(Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)))
    },
    calculateSeconds (difference) {
      return this.formatNumber(Math.floor((difference % (1000 * 60)) / 1000))
    },
    formatNumber (number) {
      return number < 10 ? '0' + number : number
    }
  },
  mounted () {
    this.setInputFilter(document.getElementById('limitHours'), (value) => {
      return /^\d*$/.test(value) && (value === '' || parseInt(value) <= 24)
    })
    this.setInputFilter(document.getElementById('limitMinutes'), (value) => {
      return /^\d*$/.test(value) && (value === '' || parseInt(value) <= 60)
    })
  }
}
</script>

<style>
    .bottom {
      margin-top: 25px;
      font-size: 34px;
    }
    .time {
      font-size: 85px;
    }
</style>
