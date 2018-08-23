/*
style="-webkit-user-select:text;" is needed for iPad

*/

const editor = new Editor();

function getCaretCharacterOffsetWithin(element) {
  let caretOffset = 0;
  const doc = element.ownerDocument || element.document;
  const win = doc.defaultView || doc.parentWindow;
  let sel;
  if (typeof win.getSelection !== "undefined") {
    sel = win.getSelection();
    if (sel.rangeCount > 0) {
      let range = win.getSelection().getRangeAt(0);
      let preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(element);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      caretOffset = preCaretRange.toString().length;
    }
  } else if ((sel = doc.selection) && sel.type != "Control") {
    let textRange = sel.createRange();
    let preCaretTextRange = doc.body.createTextRange();
    preCaretTextRange.moveToElementText(element);
    preCaretTextRange.setEndPoint("EndToEnd", textRange);
    caretOffset = preCaretTextRange.text.length;
  }
  return caretOffset;
}

function getCaretPosition() {
  if (window.getSelection && window.getSelection().getRangeAt) {
    let range = window.getSelection().getRangeAt(0);
    let selectedObj = window.getSelection();
    let rangeCount = 0;
    let childNodes = selectedObj.anchorNode.parentNode.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
      if (childNodes[i] == selectedObj.anchorNode) {
        break;
      }
      if (childNodes[i].outerHTML)
        rangeCount += childNodes[i].outerHTML.length;
      else if (childNodes[i].nodeType == 3) {
        rangeCount += childNodes[i].textContent.length;
      }
    }
    return range.startOffset + rangeCount;
  }
  return -1;
}


function showCaretPos(event) {
  let el = event.target;
  let caretPosEl = document.getElementById("caretPos");
  editor.caretPos = getCaretPosition();
  if (!editor.selectedLines)
    return;
  const line = editor.selectedLines[0].dataset.lineNumber;
  caretPosEl.textContent = "Caret position in line: " + line + " at index: " + editor.caretPos; //getCaretCharacterOffsetWithin(el);
}


let mousedown = null;
let activeLine = null;
function handleMouse(event) {
    console.log(event)
    const that = event.target;
    if (tooltipElem) {
        tooltipElem.remove();
        tooltipElem = null;
    }
    switch (event.type) {
        case 'mousedown':
            if (that.classList.contains('rule')) {
                //if rule was already selected, start after current rule name
                if (that.textContent.length > 0){
                    const indexColon = that.textContent.indexOf(':');
                    if (indexColon >= 0){
                        event.preventDefault();
                        SetCaretPosition(that,indexColon+1);
                        ruleSelected = true;
                    }
                } else {
                    ruleSelected = false;
                }
                break;
            }
            editor.selectedLines = null;
            mousedown = event;
            if(activeLine !== null){
                activeLine.contentEditable = 'false';
            }
            break;
        case 'mouseup':
            if (that.classList.contains('rule'))
                return;
            if (mousedown !== null && Math.abs(mousedown.clientX - event.clientX) < 3){
                // only update if a line was selected
                if (that.classList.contains('line') || that.parentNode.classList.contains('line')){
                    that.contentEditable = 'true';
                    that.focus();
                    editor.selectedLines = [that];
                    console.log(editor.selectedLines)
                    const sel = window.getSelection();
                    if (sel.type === "Caret") {
                        const range = sel.getRangeAt(0);
                        editor.caretPos = range.startOffset;
                        console.log(editor.caretPos)
                    }
                    activeLine = that;
                } 
            }
            const sel = window.getSelection()
            if (sel.type === 'Range') {
                const range = sel.getRangeAt(0)
                const fragments = range.cloneContents()
                const nodeList= fragments.querySelectorAll('.line')
                if (nodeList.length > 0)
                    editor.selectedLines = nodeList;
                else {
                    editor.selectedLines = [that.closest('.line')];
                }
                console.log(editor.selectedLines)
            }
            break;
    }
}

const sugg = new Map();
sugg.set("∧ And", '∧');
sugg.set("v Or", '∨');
sugg.set("¬ Not", '¬');
sugg.set("∀ For All", '∀');
sugg.set("-> Implication", '→');
sugg.set("<-> Bi-Implication", '↔');
sugg.set("∃ Exists", '∃');
sugg.set("⊥ Bottom", '⊥');

const suggestrules = new Map();
suggestrules.set("∧ And Intro", '∧ Intro:');
suggestrules.set("∧ And Elim", '∧ Elim:');
suggestrules.set("v Or Intro", '∨ Intro:');
suggestrules.set("v Or Elim", '∨ Elim:');
suggestrules.set("¬ Not Intro", '¬ Intro:');
suggestrules.set("¬ Negation Intro", '¬ Intro:');
suggestrules.set("¬ Not Elim", '¬ Elim:');
suggestrules.set("¬ Negation Elim", '¬ Elim:');
suggestrules.set("∀ For All Intro", '∀ Intro:');
suggestrules.set("∀ Universal Intro", '∀ Intro:');
suggestrules.set("∀ For All Elim", '∀ Elim:');
suggestrules.set("∀ Universal Elim", '∀ Elim:');
suggestrules.set("-> Implication Intro", '→ Intro:');
suggestrules.set("-> Implication Elim", '→ Elim:');
suggestrules.set("<-> Bi-Implication Intro", '↔ Intro:');
suggestrules.set("<-> Bi-Implication Elim", '↔ Elim:');
suggestrules.set("∃ Existential Intro", '∃ Intro:');
suggestrules.set("∃ Existential Elim", '∃ Elim:');
suggestrules.set("⊥ Bottom Intro", '⊥ Intro:');
suggestrules.set("⊥ Bottom Elim", '⊥ Elim:');
suggestrules.set("= Identity Intro", '= Intro:');
suggestrules.set("= Identity Elim", '= Elim:');
suggestrules.set("Reiteration", 'Reit:');
function suggest(search) {
     // escape brackets
    search = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    // enclose search term in brackets
    const regex = new RegExp("(" + search.split(' ').join('|') + ")", "gi");
    console.log(search,regex)

    const results = new Map();
    for (const [matchstring,token] of sugg){
        if (regex.test(matchstring))
            results.set(token,[matchstring,matchstring.replace(regex,'<b>$1</b>')]);
    }
    console.log(results)
    return results;
}
function suggestRules(search) {
     // escape brackets
    search = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    search = search.trimStart();
    search = search.replace(/\s+/,' ')
    // enclose search term in brackets
    const regex = new RegExp("(" + search + ")", "gi");
    console.log(search,regex)

    const results = new Map();
    for (const [matchstring,token] of suggestrules){
        if (regex.test(matchstring))
            results.set(token,[matchstring,matchstring.replace(regex,'<b>$1</b>')]);
    }
    console.log(results)
    return results;
}

let currentTokenLeft = 0;
let tooltipElem;
let tabProcessed = false;
let enterProcessed = false;
let selectionIndex = 0;
let lineKeydown = 0;

function handleKeydownRule(event){
    console.log('rule keydown')
    const that = event.target;
    const caretPos = getCaretPosition();
    const key = event.key;
    const lineNo = parseInt(that.dataset.lineNumber);
    switch (key) {
        case ":":
        case "Enter":
            if (tooltipElem){
                break;
            }
            const next = editor.addNewLineAfter(lineNo);
            next.style.textIndent = (that.previousElementSibling.dataset.level * indentAmount) + 'px';
            next.dataset.level = that.previousElementSibling.dataset.level;
            next.style.zIndex = parseInt(100 - next.dataset.level);
            editor.selectedLines = [next];
            SetCaretPosition(next,0);
            enterProcessed = true;
            break;
        case "ArrowDown":
            if (tooltipElem){
              break;
            }
            if (lineNo < editor.numberOfLines) {
                const next = document.getElementById('l'+(lineNo + 1));
                editor.selectedLines = [next];
                SetCaretPosition(next,editor.caretPos);
            }
            break;
        case "ArrowUp":
            if (tooltipElem){
                break;
            }
            if (lineNo > 1) {
                const next = document.getElementById('l'+(lineNo - 1));
                editor.selectedLines = [next];
                SetCaretPosition(next,editor.caretPos);
            }
            break;
        case "ArrowLeft":
            if (that.textContent[caretPos-1] == ':'){
                //do not allow past colon
            } else if (that.textContent.trim() == '') {
                // go back to end of line
                SetCaretPosition(that.previousElementSibling,that.previousElementSibling.textContent.length);
            } else {
                return
            }
            break;
        case "Backspace":
            console.log('Backspace')
            if (that.textContent[caretPos-1] == ':'){
                //delete whole line if rule will be deleted
                that.textContent = '';
                ruleSelected = false;
            } else if (that.textContent.trim() == '') {
                // go back to end of line
                SetCaretPosition(that.previousElementSibling,that.previousElementSibling.textContent.length);
            } else {
                return;
            }
            break
        case "Tab":
            if(tooltipElem){
                break;
            }
            if(event.shiftKey){
                 // go back to end of line
                SetCaretPosition(that.previousElementSibling,that.previousElementSibling.textContent.length);
            }
            break;
        case "r":
              if (event.ctrlKey === true ) {
                    console.log('jump back to line');
                    if(that.previousElementSibling) {
                        that.previousElementSibling.focus();
                    }
                break;
              }
            return;
        default:
            if (ruleSelected) {
                //only allow line numbers and comma and minus after rule was selected
                if(key >= '0' && key <='9' || key == ',' || key == '-' || key == 'ArrowRight' || key == 'Delete' )
                    return
                break
            }
            return;
    }
    event.preventDefault();
}

function highlightOperator(lineNumber,...matches){
    const matchOperatorClassName = ' highlightOperatorOk';
    const matchFormulaClassName = ' highlightFormulaOk';

    const line = editor.getLineByNumber(lineNumber);
    if (!line) return;

    const formula = parseLineDiv(line);
    if (!formula) return;

    let matchOperator = null;
    let matchFormulas = []
    for (const match of matches){
        if (typeof match == 'number' ) {
            matchOperator = match;
        } else if (match instanceof Formula){
            matchFormulas.push(match);
        }
    }

    // try to highlight corresponding logical connective in current formula
    if (formula.connective) {
        // -> / <->
        const connective = formula.connective;
        const offset = connective.pos;
        const length = connective.lexeme.length;
        const content = line.textContent;
        const before = content.substring(0,offset);
        const after =  content.substring(offset+length);
        const opMatch = connective.type == matchOperator ? matchOperatorClassName : '';
        const beforeFormula = parseText(before);
        let foundForm = false;
        if (beforeFormula) {
            const matchForm = String(beforeFormula);
            for (const form of matchFormulas){
                if (String(form) == matchForm){
                    foundForm = true;
                    break;
                }
            }
        }
        const formMatch = foundForm ? matchFormulaClassName : '';
        line.innerHTML = `<span class='connectivePart${formMatch}'>${before}</span><span class='connectiveHighlightBinary${opMatch}'>${connective.lexeme}</span><span class='connectivePart'>${after}</span>`;
    } else if (formula.connectives) {
        // and / or
        let html = '';
        let content = line.textContent;
        let i = 0;

        for (const connective of formula.connectives){
            const offset = connective.pos - i;
            const length = connective.lexeme.length;
            const before = content.substring(0,offset);
            const opMatch = connective.type == matchOperator ? matchOperatorClassName : '';
            const beforeFormula = parseText(before);
            let foundForm = false;
            if (beforeFormula) {
                const matchForm = String(beforeFormula);
                for (const form of matchFormulas){
                    if (String(form) == matchForm){
                        foundForm = true;
                        break;
                    }
                }
            }
            const formMatch = foundForm ? matchFormulaClassName : '';
            html += `<span class='connectivePart${formMatch}'>${before}</span><span class='connectiveHighlightBinary${opMatch}'>${connective.lexeme}</span>`;
            i = offset + length;
            content = content.substring(i);
        }
        const beforeFormula = parseText(content);
        let foundForm = false;
        if (beforeFormula) {
            const matchForm = String(beforeFormula);
            for (const form of matchFormulas){
                if (String(form) == matchForm){
                    foundForm = true;
                    break;
                }
            }
        }
        const formMatch = foundForm ? matchFormulaClassName : '';
        html += `<span class='connectivePart${formMatch}'>${content}</span>`;
        line.innerHTML = html;
    } else if (formula.operator) {
        // not
        const connective = formula.operator;
        const offset = connective.pos;
        const length = connective.lexeme.length;
        const content = line.textContent;
        const before = content.substring(0,offset);
        const after =  content.substring(offset+length);
        const opMatch = connective.type == matchOperator ? matchOperatorClassName : '';
        line.innerHTML = `${before}<span class='connectiveHighlightUnary${opMatch}'>${connective.lexeme}</span><span class='connectivePart'>${after}</span>`;
    } else if (formula.quantifier){
        // universal / existential
        const connective = formula.quantifier;
        const offset = connective.pos;
        const length = formula.variable.pos + formula.variable.lexeme.length;
        const content = line.textContent;
        const before = content.substring(0,offset);
        const after =  content.substring(offset+length);
        const opMatch = connective.type == matchOperator ? matchOperatorClassName : '';
        line.innerHTML = `${before}<span class='connectiveHighlightUnary${opMatch}'>${connective.lexeme}${formula.variable}</span><span class='connectivePart'>${after}</span>`;
    }
}

//XXX FIXME on per line basis
let ruleSelected = false;

function handleKeyupRule(event) {
    const key = event.key;
    const that = event.target;
    const lineNo = parseInt(that.dataset.lineNumber);

    // get token under caret position
    let currentToken = null;
    const caretPos = getCaretPosition();
    const tokens = new Scanner(that.textContent, that.dataset.lineNumber).scanTokens();
    
    const ruleLineNumbers = new Set();
    for (let i=0; i<tokens.length; i++) {
        if (tokens[i].type == TokenType.NUMBER){
            ruleLineNumbers.add(tokens[i].literal);
            // check for number range
            if(tokens[i+1].type == TokenType.MINUS && tokens[i+2].type == TokenType.NUMBER) {
                const end = tokens[i+2].literal;
                if (end > 100)
                    continue;
                for(let start = (tokens[i].literal+1); start <= end; start++){
                    ruleLineNumbers.add(start);
                }
                i+=2;
            }
        }
    }
    for (let token of tokens) {
        const tokenEnd = token.pos + token.lexeme.length;
        if (token.pos <= caretPos &&  caretPos <= tokenEnd) {
            currentToken = token;
            break;
        }
    }
    console.log('currentToken', currentToken)
    if (tooltipElem) {
        tooltipElem.remove();
        tooltipElem = null;
    }

    //no autocompletion if lines were changed between key presses
    if (lineNo != lineKeydown) {
        return;
    }


    let triggerAutocompletion = false;
    if (key.length == 1 ) {
        triggerAutocompletion = true;
    } else if (key == 'Enter' || key == 'Tab') {
        triggerAutocompletion = true;
    } else if (key == 'Control' || key == 'Shift') {
        triggerAutocompletion = true;
    } else if (key == 'ArrowUp') {
        triggerAutocompletion = true;
        selectionIndex--;
    } else if (key == 'ArrowDown') {
        triggerAutocompletion = true;
        selectionIndex++;
    } else {
        triggerAutocompletion = false;
        selectionIndex = 0;
    }

    if (ruleSelected){
        triggerAutocompletion = false;
        document.querySelectorAll('.line').forEach(line => {
            line.classList.remove('selectedLine');
        });
        console.log(ruleLineNumbers)
        let lines = [];
        for (let number of ruleLineNumbers) {
            const line = editor.getLineByNumber(number);
            if (line) {
                line.classList.add('selectedLine');
                lines.push(new Parser(new Scanner(line.textContent,number).scanTokens()).parse());
            }
        }

        const indexColon = that.textContent.indexOf(':');
        const rule = that.textContent.substring(0,indexColon);
        switch (rule) {
            case "∧ Intro": {
                    console.log('AND Intro selected');
                    const rule = new RuleAndIntro(...lines);
                    const currentLine = parseLineDiv(editor.getLineByNumber(lineNo));
                    if (currentLine) {
                        highlightOperator(lineNo,TokenType.AND,...lines);
                        currentLine.setRule(rule);
                        if (currentLine.check()) {
                            that.classList.add('ruleOk');
                            that.classList.remove('ruleError');
                        } else {
                            const error = currentLine.rule.getError();
                            console.log(error)
                            that.classList.remove('ruleOk');
                            that.classList.add('ruleError');

                        }
                    }
                }
            break;
            case "Reit": {
                    console.log('Reit selected');
                    const rule = new RuleReiteration(lines[0]);
                    const currentLine = parseLineDiv(editor.getLineByNumber(lineNo));
                    if (currentLine) {
                        currentLine.setRule(rule);
                        if (currentLine.check()) {
                            that.classList.add('ruleOk');
                        } else {
                            that.classList.remove('ruleOk');
                        }
                    }
                }
            break;
        }
    }

    if (triggerAutocompletion) {
        //search from beginnig of current token until caret position
        // let searchString = currentToken.lexeme.substring(0,caretPos - currentToken.pos);
        let searchString = that.textContent;
        console.log('search', searchString)
        if (searchString.length != 0){
            let results = suggestRules(searchString);
            if (results.size == 0)
                return;
            if (selectionIndex < 0) {
                selectionIndex = 0;
            } else if (selectionIndex >= results.size) {
                selectionIndex = results.size-1;
            }
            console.log('sel index', selectionIndex);

            let tooltipHtml = '<ul>';
            results = Array.from(results) 
            for (let i in results) {
                const description = results[i][1][1];
                if (selectionIndex == i)
                    tooltipHtml += `<li data-value='${results[i][0]}' class='tooltipHighlight'>${description}`;
                else
                    tooltipHtml += `<li>${description}`;
            }
            tooltipHtml += '</ul>';
            tooltipElem = document.createElement('div');
            tooltipElem.className = 'tooltipRule';
            tooltipElem.innerHTML = tooltipHtml;
            document.body.append(tooltipElem);

            // position it below line
            const coords = that.getBoundingClientRect();
            const range = document.createRange();
            range.setStart(that.childNodes[0],currentToken.pos);
            currentTokenLeft = range.getBoundingClientRect().left;
            let left = currentTokenLeft - 10;
            if (left < 0) left = 0; // don't cross the left window edge

            let top = coords.top + that.offsetHeight;
            
            tooltipElem.style.left = left + 'px';
            tooltipElem.style.top = top + 'px';
            
            if ((key == 'Tab' || key == 'Enter')) {
                // rule was selected
                const suggestion = results[selectionIndex][0];
                that.textContent = suggestion;
                tooltipElem.remove();
                tooltipElem = null;
                selectionIndex = 0;
                ruleSelected = true;
                highlightOperator(lineNo,TokenType.AND);
                SetCaretPosition(that,currentToken.pos + suggestion.length);
            }
            if (key == 'Escape') {
                tooltipElem.remove();
                tooltipElem = null;
                currentToken = null;
            }
        }
    }
}

function handleKeyup(event) {
    showCaretPos(event);
    const key = event.key;
    const that = event.target;
    if (that.classList.contains('rule')) {
        handleKeyupRule(event);
        return;
    }
    const lineNo = parseInt(that.dataset.lineNumber);

    // get token under caret position
    let currentToken = null;
    let textval = that.textContent;
    const caretPos = getCaretPosition();
    const tokens = new Scanner(that.textContent, that.dataset.lineNumber).scanTokens();
    
    for (let token of tokens) {
        const tokenEnd = token.pos + token.lexeme.length;
        if (token.pos <= caretPos &&  caretPos <= tokenEnd) {
            currentToken = token;
            break;
        }
    }
    console.log('currentToken', currentToken)
    if (tooltipElem) {
        tooltipElem.remove();
        tooltipElem = null;
    }

    //no autocompletion if lines were changed between key presses
    if (lineNo != lineKeydown) {
        return;
    }
    // add matching parenthesis
    if (key == '(') {
        const closeCount = (that.textContent.match(/\)/g) || []).length;
        const openCount = (that.textContent.match(/\(/g)).length;
        // XXX 
        if (openCount != closeCount){
            document.execCommand('insertText',false, ')');
            SetCaretPosition(that,caretPos);
        }
    }

    let triggerAutocompletion = false;
    if (key.length == 1 && key != ' ') {
        triggerAutocompletion = true;
    } else if (!enterProcessed && key == 'Enter' || !tabProcessed && key == 'Tab') {
        triggerAutocompletion = true;
    } else if (key == 'Control' || key == 'Shift') {
        triggerAutocompletion = true;
    } else if (key == 'ArrowUp') {
        triggerAutocompletion = true;
        selectionIndex--;
    } else if (key == 'ArrowDown') {
        triggerAutocompletion = true;
        selectionIndex++;
    } else {
        triggerAutocompletion = false;
        selectionIndex = 0;
    }

    if (triggerAutocompletion && currentToken && currentToken.type != TokenType.EOF) {
        //search from beginnig of current token until caret position
        let searchString = currentToken.lexeme.substring(0,caretPos - currentToken.pos);
        if (searchString.length != 0){
            let results = suggest(searchString);
            if (results.size == 0)
                return;
            if (selectionIndex < 0) {
                selectionIndex = 0;
            } else if (selectionIndex >= results.size) {
                selectionIndex = results.size-1;
            }
            console.log('sel index', selectionIndex);

            let tooltipHtml = '<ul>';
            results = Array.from(results) 
            for (let i in results) {
                const description = results[i][1][1];
                if (selectionIndex == i)
                    tooltipHtml += `<li class='tooltipHighlight'>${description}`;
                else
                    tooltipHtml += `<li>${description}`;
            }
            tooltipHtml += '</ul>';
            tooltipElem = document.createElement('div');
            tooltipElem.className = 'tooltip';
            tooltipElem.innerHTML = tooltipHtml;
            document.body.append(tooltipElem);

            // position it below line
            const coords = that.getBoundingClientRect();
            const range = document.createRange();
            range.setStart(that.childNodes[0],currentToken.pos);
            currentTokenLeft = range.getBoundingClientRect().left;
            let left = currentTokenLeft - 10;
            if (left < 0) left = 0; // don't cross the left window edge

            let top = coords.top + that.offsetHeight;
            
            tooltipElem.style.left = left + 'px';
            tooltipElem.style.top = top + 'px';
            
            if ((key == 'Tab' || key == 'Enter')) {
                console.log('set');
                const suggestion = results[selectionIndex][0]; // logic symbol
                that.textContent = that.textContent.slice(0,currentToken.pos) +  suggestion + that.textContent.slice( currentToken.pos + searchString.length);
                tooltipElem.remove();
                tooltipElem = null;
                SetCaretPosition(that,currentToken.pos + suggestion.length);
            }
            if (key == 'Escape') {
                tooltipElem.remove();
                tooltipElem = null;
                currentToken = null;
            }
        }
    }
    // end autocompletion
}

function parseLineDiv(div) {
    const text = div.textContent.trim();

    if ( text != '' && div.dataset.lineNumber){
          console.log('check line')
          const parsedFormula = new Parser(new Scanner(text,div.dataset.lineNumber).scanTokens()).parse();
          if (parsedFormula) {
              console.log(parsedFormula)
              div.classList.add('lineOk'); //='#4CAF50 -9px 0px 0px 0px';
              div.classList.remove('lineError');
              return parsedFormula;
          } else {
              div.classList.add('lineError');
              div.classList.remove('lineOk');//='#E91E63 -9px 0px 0px 0px';
              return null;
              console.log('no valid formula in line', div.dataset.lineNumber)
          }
    }
}

function parseText(text){
    return new Parser(new Scanner(text.trim(),0).scanTokens()).parse();
}

const indentAmount = '50';
function handleKeydown(event) {
    console.log('keydown')
    enterProcessed = false;
    tabProcessed = false;
    const that = event.target;
    if (event.defaultPrevented) {
        return; // Do nothing if the event was already processed
    }
    const lineNo = parseInt(that.dataset.lineNumber);
    lineKeydown = lineNo;
    if (that.classList.contains('rule')) {
        handleKeydownRule(event);
        return;
    }
    //const caretPos = getCaretPosition();
    const caretPos = editor.caretPos;
    switch (event.key) {
        case "ArrowLeft":
          console.log('left',lineNo);
          if (lineNo > 1 && caretPos === 0) {
            const next = document.getElementById('l'+(lineNo -1));
            SetCaretPosition(next,next.textContent.length);
          } else {
            return;
          }
          break;
        case "ArrowRight":
          console.log('right',lineNo);
          if (lineNo < editor.numberOfLines && caretPos === that.textContent.length) {
            const next = document.getElementById('l'+(lineNo +1));
            SetCaretPosition(next,0);
          } else {
            return;
          }
          break;
        case "ArrowDown":
            if (tooltipElem){
              break;
            }
          console.log('down',lineNo);
          if (lineNo < editor.numberOfLines) {
            const next = document.getElementById('l'+(lineNo + 1));
            parseLineDiv(that);
            SetCaretPosition(next,editor.caretPos);
          } else {
            //add new line if in last line
            const next = editor.addNewLineAfter(lineNo);
            next.style.textIndent = (that.dataset.level * indentAmount) + 'px';
            next.dataset.level = that.dataset.level;
            next.style.zIndex = parseInt(100 - next.dataset.level);
            SetCaretPosition(next,0);
          }
          break;
        case "ArrowUp":
          if (tooltipElem){
            break;
          }
          console.log('up', lineNo);
          if (lineNo > 1) {
            const next = document.getElementById('l'+(lineNo - 1));
            parseLineDiv(that);
            SetCaretPosition(next,editor.caretPos);
          }
          break;
        case "Enter":
          if (tooltipElem){
            break;
          }
          console.log('Enter');
          const next = editor.addNewLineAfter(lineNo);
          next.style.textIndent = (that.dataset.level * indentAmount) + 'px';
          next.dataset.level = that.dataset.level;
          next.style.zIndex = parseInt(100 - next.dataset.level);
          //split content
          const textLeft = that.textContent.slice(caretPos);
          that.textContent = that.textContent.slice(0,caretPos);
          next.textContent = textLeft;
          SetCaretPosition(next,0);
          parseLineDiv(that);
          enterProcessed = true;
          break;
        case "Tab":
          if (tooltipElem){
            break;
          }

          console.log('Tab');
          //rule selection
          if(that.textContent.trim().length > 0 && caretPos == that.textContent.length){
            console.log('jump to rule selection')
            if(that.nextElementSibling) {
                that.textContent = that.textContent.trim();
                that.nextElementSibling.focus();
            }
            tabProcessed = true;
            break;
          }
          let indentLevel = that.dataset.level;
          if (event.shiftKey == true){
            if (indentLevel > 0)
                //close subproof
                that.style.textIndent = (--indentLevel * indentAmount) + 'px';
          } else {
                //open subproof
                const levelPrevLine = (lineNo > 1) ? editor.getLineByNumber(lineNo-1).dataset.level : 0;
                if (levelPrevLine < indentLevel) {
                    //do nothing since only one subproof level is allowed
                    tabProcessed = true;
                    break;
                }
                that.style.textIndent = (++indentLevel * indentAmount) + 'px';
          }
          that.dataset.level = indentLevel;
          that.style.zIndex = parseInt(100 - that.dataset.level);
          tabProcessed = true;
          editor.checkFitchLines();
          break;
        case "Backspace":
            {
                console.log('Backspace');
                const sel = window.getSelection();
                if (sel.type === "Caret") {
                    const range = sel.getRangeAt(0);
                    if (range.startOffset == 0) {
                        let indentLevel = that.dataset.level;
                        // subproof
                        if (indentLevel > 0){
                            that.style.textIndent = (--indentLevel * indentAmount) + 'px';
                            that.dataset.level = indentLevel;
                            that.style.zIndex = parseInt(100 - that.dataset.level);
                            editor.checkFitchLines();
                            return;
                        } else {
                           if (lineNo > 0) {
                                const text = that.textContent;
                                editor.removeLine(lineNo);
                                const next = document.getElementById('l'+(lineNo - 1));
                                const cursorPos = next.textContent.length;
                                next.textContent += text;
                                SetCaretPosition(next, cursorPos);
                                // event handled, don't delete any character on next line!
                                break;
                            }
                        }
                    } else {
                        return;
                    }
                }
            }
          //break; intentionally Fall through to delete...
        case "Delete":
          console.log('Delete');
          {
            const sel = window.getSelection();
            if (sel.type === 'None')
                return;
            const range = sel.getRangeAt(0);
            if (sel.type === 'Range') {
                if (editor.selectedLines !== null && editor.selectedLines.length > 1) {
                    console.log(editor.selectedLines)
                    // only delete selection
                    range.deleteContents();
                    // XXX add deleted rule selection
                    const firstLineId = editor.selectedLines[0].id;
                    const firstLineAfterDeletion = document.getElementById(firstLineId);
                    if (!firstLineAfterDeletion.nextElementSibling && editor.selectedLines[0].nextElementSibling){
                        // if rule selection is missing, add it again
                        firstLineAfterDeletion.parentNode.append(editor.selectedLines[0].nextElementSibling);
                    }
                    let removeLines = [];
                    editor.selectedLines.forEach(line => {
                        const lineNo = parseInt(line.dataset.lineNumber);
                        if (lineNo == 1)
                            return;
                        const lineAfterEdit = editor.getLineByNumber(lineNo);
                        if (lineAfterEdit !== null && lineAfterEdit.textContent.trim().length == 0) {
                            editor.removeLine(lineNo)
                        }
                    });
                    editor.updateLineNumbers();
                    const startLine = editor.getLineByNumber(editor.selectedLines[0].dataset.lineNumber);
                    SetCaretPosition(startLine,range.startOffset);
                } else if(editor.selectedLines !== null && editor.selectedLines.length == 1){
                    range.deleteContents();
                    const firstLineId = editor.selectedLines[0].id;
                    const firstLineAfterDeletion = document.getElementById(firstLineId);
                    if (!firstLineAfterDeletion.nextElementSibling){
                        // if rule selection is missing, add it again
                        firstLineAfterDeletion.parentNode.append(editor.selectedLines[0].nextElementSibling);
                    }
                    SetCaretPosition(editor.selectedLines[0],range.startOffset);
                } else {
                    return;
                }
            } else {
                // Delete whole line if line is empty
                if (that.textContent.trim().length == 0 ){
                    const next = editor.removeLine(lineNo);
                    if (next !== null){
                        SetCaretPosition(next,editor.caretPos);
                    }
                } 
                else {
                    // if at end of line, delete next line and append content of that line to current line
                    if (caretPos == that.textContent.length) {
                        const next = editor.getLineByNumber(lineNo+1);
                        if (next){
                            const text = next.textContent.trim();
                            editor.removeLine(lineNo+1);
                            that.textContent += text;
                            SetCaretPosition(that,caretPos);
                            break;
                        }
                    }
                    // propagate event further up
                    return;
                }
            }
          }
          break;
        case "r":
            //jump to rule selection
          console.log('r',lineNo,event);
          if (that.textContent.trim().length > 0 && event.ctrlKey === true ) {
                console.log('jump to rule');
                if(that.nextElementSibling) {
                    that.textContent = that.textContent.trim();
                    that.nextElementSibling.focus();
                }

            break;
          }
          if (!event.ctrlKey)
            return;
          break;
        case "d":
        //delete current line
          console.log('d',lineNo,event);
          if (lineNo > 0 && event.ctrlKey === true ) {
            console.log('delete line');
            const next = editor.removeLine(lineNo);
            if (next !== null)
                SetCaretPosition(next,editor.caretPos);
            break;
          } 
          if (!event.ctrlKey)
            return;
          break;
        default:
            if (event.ctrlKey || event.shiftKey)
                return;
            
            const sel = window.getSelection();
            if (sel.type === 'None')
                return;
            const range = sel.getRangeAt(0);
            if (sel.type === 'Range') {
                // if a range was selected and any character was typed
                if(editor.selectedLines !== null && editor.selectedLines.length == 1){
                    range.deleteContents();
                    SetCaretPosition(editor.selectedLines[0],range.startOffset);
                } 
            }
          return; // Quit when this doesn't handle the key event.
    }

    // Cancel the default action to avoid it being handled twice
    event.preventDefault();
}

function handlePaste(event) {
    console.log('paste')
    event.preventDefault()
    const lines = event.clipboardData.getData('text').split('\n');
    let that = event.target;
    if (that.nodeType == 3) {
        // Firefox target is of type text node
        that = that.parentNode;
    }
    const indentLevel =that.dataset.level;
    const startline = that.closest('.line').dataset.lineNumber;
    if (startline < 1)
        return
    if (lines.length == 0)
        return
    const text = lines[0];
    const sel = window.getSelection()
    const range = sel.getRangeAt(0)
    if (sel.type === 'Caret')
        document.execCommand("insertText", false, text);
    else if (sel.type === 'Range') {
        range.deleteContents();
        if (range.commonAncestorContainer.nodeType != 3){
            // we have a selection over multiple lines
            // append content on first line
            that.textContent += text;
        } else {
            range.insertNode(document.createTextNode(text));
        }
    }
    range.collapse()
    if (lines.length == 1) {
        that.contentEditable = 'true';
        that.focus();
        editor.selectedLines = [that]
        return
    }
    let lastLine = that;
    let currentLine = parseInt(that.dataset.lineNumber);
    for (let i=1; i<lines.length; i++){
       const newLine = editor.addNewLineAfter(currentLine++);
       newLine.textContent = lines[i];
       newLine.dataset.level = indentLevel;
       newLine.style.textIndent = (indentLevel * indentAmount ) + 'px';
       lastLine = newLine;
    }
    SetCaretPosition(lastLine,lastLine.textContent.length);
}

function handleBlur(event) {
    console.log('focusout')
    const that = event.target;
    const lineNo = that.dataset.lineNumber;
    if (that.classList.contains('rule')){
        //clean up
        document.querySelectorAll('.line').forEach(line => {
            line.classList.remove('selectedLine');
        });
        //remove whitespace
        if(that.textContent.trim() == ''){
            that.textContent='';
        }
        // remove highlights/hints 
        that.previousElementSibling.textContent = that.previousElementSibling.textContent;
    }
    editor.checkFitchLines();
}

function handleFocus(event) {
    console.log('focusin')
    const that = event.target;
    const lineNo = that.dataset.lineNumber;
    if (that.classList.contains('rule')) {
        highlightOperator(lineNo)
        //if rule was already selected, start at end
        if (that.textContent.length > 0){
            const indexColon = that.textContent.indexOf(':');
            if (indexColon >= 0){
                event.preventDefault();
                SetCaretPosition(that,that.textContent.length);
                ruleSelected = true;
            }
        } else {
            ruleSelected = false;
        }
    }
    if (that.classList.contains('line')) {
        // reset styling to plain text (strip tags)
        that.textContent = that.textContent;
    }
}

window.addEventListener("load", function(){
    const ed = document.getElementById('editor');
    ed.addEventListener('keyup', handleKeyup);
    ed.addEventListener('paste', handlePaste);
    document.addEventListener("keydown", handleKeydown);
    ed.addEventListener("focusout", handleBlur);
    ed.addEventListener("focusin", handleFocus);
    //register on window to capture mouseups everywhere (i.e. if user selects fast or imprecisely)
    window.addEventListener("mousedown", handleMouse);
    window.addEventListener('mouseup', handleMouse);
    
    editor.checkFitchLines();
    SetCaretPosition(document.getElementById('l3'),0);
});

    
    function setCursor() {
        const line = document.getElementById('l3');
        SetCaretPosition(line,3);
    }

    // Move caret to a specific point in a DOM element
    function SetCaretPosition(el, pos){
        //console.log('caret', pos, el)
        if (!el)
            return -1;
        if (el.classList.contains('line')){
            editor.selectedLines = [el];
            el.contentEditable = 'true';
            if(activeLine && activeLine != el){
                    activeLine.contentEditable = 'false';
            }
            activeLine = el;
        }
        
        if (el.childNodes.length == 0) {
            el.appendChild(document.createTextNode(''));           
        }
        //XXX FIXME
        // Loop through all child nodes
        for(let node of el.childNodes){
            if(node.nodeType == 3){ // we have a text node
                pos = Math.min(node.length,pos);
                // finally add our range
                let range = document.createRange(),
                    sel = window.getSelection();
                range.setStart(node,pos);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
                return -1; // we are done
                
            }
            // if(node.nodeType == 3){ // we have a text node
            //     if(node.length >= pos){
            //         // finally add our range
            //         let range = document.createRange(),
            //             sel = window.getSelection();
            //         range.setStart(node,pos);
            //         range.collapse(true);
            //         sel.removeAllRanges();
            //         sel.addRange(range);
            //         return -1; // we are done
            //     }else{
            //         pos -= node.length;
            //     }
            // } else {
            //     pos = SetCaretPosition(node,pos);
            //     if(pos == -1){
            //         return -1; // no need to finish the for loop
            //     }
            // }
        }
        return pos; // needed because of recursion stuff
    }

    //underlines the selected text
    function underline()
    {
        document.execCommand("underline", false, null);
    }
   
    //makes the selected text as hyperlink.
    function link()
    {
        let url = prompt("Enter the URL");
        document.execCommand("createLink", false, url);
    }
   
    //displays HTML of the output
    function displayhtml()
    {
        //set textContent of pre tag to the innerHTML of editable div. textContent can take any form of text and display it as it is without browser interpreting it. It also preserves white space and new line characters.
        document.getElementsByClassName("htmloutput")[0].textContent = document.getElementsByClassName("editor")[0].innerHTML;
    }
