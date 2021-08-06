/* eslint-disable linebreak-style */
/* eslint-disable no-param-reassign */
/* eslint-disable no-plusplus */
/* eslint-disable import/extensions */
import * as storage from './Storage.js';
import create from './utils/create.js';
import language from './layouts/index.js'; // languages export :  { ru, en }
import Key from './Key.js';

const main = create('main', '',
  [create('h1', 'title', 'RSS Virtual Keyboard'),
    create('p', 'hint', 'Use left <kbd>Ctrl</kbd> + <kbd>Alt</kbd> to switch language. Last language saves in localStorage'),
  ]);

export default class Keyboard {
  constructor(rowsOrder) {
    this.rowsOrder = rowsOrder;
    this.keysPressed = {};
    this.isCaps = false;
  }

  init(code) {
    this.keyBase = language[code];
    this.output = create('textarea', 'output', null, main,
      ['placeholder', 'Start typing...)'],
      ['rows', 5],
      ['cols', 50],
      ['spellcheck', false],
      ['autocorrect', 'off']);
    this.container = create('div', 'keyboard', null, main, ['language', code]);
    document.body.prepend(main);
    return this;
  }

  generateLayout() {
    this.keyButtons = [];
    this.rowsOrder.forEach((row, i) => {
      const rowElement = create('div', 'keyboard__row', null, this.container, ['row', i + 1]);
      rowElement.style.gridTemplateColumns = `repeat(${row.length}, 1fr)`;
      row.forEach((code) => {
        const keyObj = this.keyBase.find((key) => key.code === code);
        if (keyObj) {
          const keyButton = new Key(keyObj);
          this.keyButtons.push(keyButton);
          rowElement.appendChild(keyButton.div);
        }
      });
    });
    document.addEventListener('keydown', this.handleEvent);
    document.addEventListener('keyup', this.handleEvent);
  }

  handleEvent = (e) => {
    if (e.stopPropagation) e.stopPropagation();
    const { code, type } = e;
    const keyObj = this.keyButtons.find((key) => key.code === code);
    if (!keyObj) return;
    this.output.focus();

    if (type.match(/keydown|mousedown/)) {
      if (type.match(/key/)) e.preventDefault();
      // Add a Shift flag
      if (code.match(/Shift/)) this.shiftKey = true;

      keyObj.div.classList.add('active');
      // Switch Language:
      // Adding keyboard special flags for language switching
      if (code.match(/Control/)) this.ctrlKey = true;
      if (code.match(/Alt/)) this.altKey = true;

      if (code.match(/Control/) && this.altKey) this.switchLanguage();
      if (code.match(/Alt/) && this.ctrlKey) this.switchLanguage();

      // release button
      // CapsLock is not pressed:
      if (!this.isCaps) {
        this.printToOutput(keyObj, this.shiftKey ? keyObj.shift : keyObj.small);
      } else if (this.isCaps) { // CapsLock is  pressed:
        if (this.shiftKey) {
          this.printToOutput(keyObj, keyObj.sub.innerHTML ? keyObj.shift : keyObj.small); //
        } else {
          this.printToOutput(keyObj, !keyObj.sub.innerHTML ? keyObj.shift : keyObj.small); //
        }
      }
    } else if (type.match(/keyup|mouseup/)) {
      keyObj.div.classList.add('active');
      if (code.match(/Shift/)) this.shiftKey = false;
      // Switch Language:
      if (code.match(/Control/)) this.ctrlKey = false;
      if (code.match(/Alt/)) this.altKey = false;
    }
  }

  switchLanguage = () => {
    const langAbbr = Object.keys(language);
    let langIdx = langAbbr.indexOf(this.container.dataset.language);
    this.keyBase = langIdx + 1 < langAbbr.length
      ? language[langAbbr[++langIdx]]
      : language[langAbbr[langIdx -= langIdx]];

    this.container.dataset.language = langAbbr[langIdx];
    storage.set('kbLang', langAbbr[langIdx]);

    this.keyButtons.forEach((button) => {
      const keyObj = this.keyBase.find((key) => key.code === button.code);
      if (!keyObj) return;
      button.shift = keyObj.shift;
      button.small = keyObj.small;
      if (keyObj.shift && keyObj.shift.match(/[^a-zA-Zа-яА-ЯёЁ0-9]/g)) { // match all special characters
        button.sub.innerHTML = keyObj.shift;
      } else {
        button.sub.innerHTML = '';
      }
      button.letter.innerHTML = keyObj.small;
    });
  }

  printToOutput(keyObj, symbol) {
    let cursorPosition = this.output.selectionStart;
    const left = this.output.value.slice(0, cursorPosition);
    const right = this.output.value.slice(cursorPosition);

    const fnButtonHandler = {
      Tab: () => {
        this.output.value = `${left}\t${right}`;
        cursorPosition += 1;
      },
      ArrowLeft: () => { // Arrow btn left offcet
        cursorPosition = cursorPosition - 1 >= 0 ? cursorPosition - 1 : 0;
      },
      ArrowRight: () => { // Arrow btn right offcet
        cursorPosition += 1;
      },
      ArrowUp: () => { // Arrow btn up offcet
        const positionFromLeft = this.output.value.slice(0, cursorPosition).match(/(\n).*$(?!\1)/g) || [[1]];
        cursorPosition = positionFromLeft[0].length;
      },
      ArrowDown: () => { // Arrow btn down offcet
        const positionFromLeft = this.output.value.slice(cursorPosition).match(/^.*(\n).*$(?!\1)/) || [[1]];
        cursorPosition += positionFromLeft[0].length;
      },
      Enter: () => {
        this.output.value = `${left}\n${right}`;
        cursorPosition += 1;
      },
      Delete: () => {
        this.output.value = `${left}${right.slice(1)}`;
      },
      Backspace: () => {
        this.output.value = `${left.slice(0, -1)}${right}`;
        cursorPosition -= 1;
      },
      Space: () => {
        this.output.value = `${left} ${right}`;
        cursorPosition += 1;
      },
    };
    if (fnButtonHandler[keyObj.code]) fnButtonHandler[keyObj.code]();
    else if (!keyObj.isFnKey) {
      cursorPosition += 1;
      this.output.value = `${left}${symbol || ''}${right}`;
    }
    // update cursor position for text area :
    this.output.setSelectionRange(cursorPosition, cursorPosition);
  }
}
