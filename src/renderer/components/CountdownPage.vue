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
              <input id="activate-btn" class="btn btn-outline-primary" type="button" value="Activate" @click="countDown">
              <input id="cancel-btn" class="btn btn-outline-secondary" type="button" value="Cancel" @click="cancel" disabled>
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
import fs from 'fs'
import path from 'path'

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
      const shutdownTimeSelect = document.querySelector('select#shutdownTimeSelect').value
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
      const shutdownTimeSelect = document.querySelector('select#shutdownTimeSelect').value
      const countDownTimer = new Date()
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
      document.getElementById('activate-btn').disabled = false
      document.getElementById('cancel-btn').disabled = true
      ipcRenderer.send('request-mainprocess-action', {'shutdown': 'cancel'})
    },
    getSettingsFile () {
      const dirPatch = path.resolve()

      return dirPatch + '/time.json'
    },
    countDown () {
      if (!this.enteredTimeIsValid()) {
        return
      }

      document.getElementById('activate-btn').disabled = true
      document.getElementById('cancel-btn').disabled = false

      const timeUntilString = `Time until shutdown:`
      document.querySelector('div#text').innerHTML = timeUntilString

      const countDownTimer = this.getCountDownTimer()
      this.displayTimer(countDownTimer - new Date().getTime())

      const shutdownCommandSelection = document.querySelector('select#shutdownCommandSelect').value
      const shutdownCommands = {
        '1': 'shutdown',
        '2': 'hibernate'
      }

      this.saveSettingsToFile()

      this.interval = setInterval(() => {
        const difference = countDownTimer - new Date().getTime()

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
      const hours = this.calculateHours(difference)
      const minutes = this.calculateMinutes(difference)
      const seconds = this.calculateSeconds(difference)

      const timeString = `${hours}:${minutes}:${seconds}`

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
    },
    saveSettingsToFile () {
      const shutdownCommandSelection = document.querySelector('select#shutdownCommandSelect').value
      const shutdownTimeSelect = document.querySelector('select#shutdownTimeSelect').value
      const hours = Number(document.querySelector('input#limitHours').value)
      const minutes = Number(document.querySelector('input#limitMinutes').value)
      const json = {
        shutdownCommandSelection,
        shutdownTimeSelect,
        hours,
        minutes
      }
      fs.writeFile(this.getSettingsFile(), JSON.stringify(json), 'utf8', (error) => {
        if (error) {
          console.log('error', error)
        }
      })
    },
    readSettingsFromFile () {
      fs.readFile(this.getSettingsFile(), (error, buffer) => {
        if (error) {
          console.log('error', error)
          return
        }

        const settings = JSON.parse(buffer.toString())
        document.querySelector('select#shutdownCommandSelect').value = settings.shutdownCommandSelection
        document.querySelector('select#shutdownTimeSelect').value = settings.shutdownTimeSelect
        document.querySelector('input#limitHours').value = settings.hours
        document.querySelector('input#limitMinutes').value = settings.minutes
      })
    }
  },
  mounted () {
    this.setInputFilter(document.getElementById('limitHours'), (value) => {
      return /^\d*$/.test(value) && (value === '' || parseInt(value) <= 24)
    })
    this.setInputFilter(document.getElementById('limitMinutes'), (value) => {
      return /^\d*$/.test(value) && (value === '' || parseInt(value) <= 60)
    })

    this.readSettingsFromFile()
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
