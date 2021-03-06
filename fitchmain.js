let tooltipToken = null;
let tooltipTokenValue = '';
function createToolTipToken(that,line) {
    if (!(line instanceof Line) ) return;
    const lineNumber = line.lineNumber;
    const operator = that.textContent.trim();
    const formula = line.formula;

    let htmlIntro = `<li> ${operator} <button data-line-number=${lineNumber} class='intro'>Intro</button> </li>`;
    let htmlElim = `<li> ${operator} <button data-line-number=${lineNumber} class='elim'>Elim</button> </li>`;
    
    if (formula instanceof FormulaNot) {
        if (!(formula.right instanceof FormulaNot)) {
            htmlElim = '';
        }
    }

    if (formula instanceof FormulaOr) {
        htmlIntro = '';
        htmlElim = `<li> ${operator} <button data-line-number=${lineNumber} class='elim'>Elim</button>
                        Formula you will conclude: <input type='text' class='tooltipTokenValue'></input>
                    </li>`;

    }

    if (line.isPremise || line.getDom().classList.contains('fitchline')){
        htmlIntro = '';
    }

    const html = `
                <ul>
                    ${htmlIntro}
                    ${htmlElim}
                </ul>
                `;
    tooltipToken = document.createElement('div');
    tooltipToken.className = 'tooltipToken';
    tooltipToken.innerHTML = html;
    document.body.append(tooltipToken);

    // position it below token
    const coords = that.getBoundingClientRect();
    let left = coords.left - 25;
    if (left < 0) left = 0; // don't cross the left window edge
    let top = coords.top + that.offsetHeight;
    tooltipToken.style.left = left + 'px';
    tooltipToken.style.top = top + 'px';
}

let mousedown = null;
let startLineSelectionForRuleLine = null;
function handleMouse(event) {
    console.log(event)
    let that = event.target;
    if (that.classList.contains('tooltipTokenValue')){
        return;
    }

    if (that.classList.contains('hint')){
        that.classList.remove('showhint');
        return;
    }

     // handle rule section via mouse
    if (that.nodeName == 'LI' && that.dataset.rule){
        event.preventDefault();
        console.log('rule selected:',that.dataset.rule)
        const suggestion = that.dataset.rule;
        const lineNo = parseInt(that.dataset.line);
        const line = editor.getLine(lineNo);
        line.getRuleDom().textContent = suggestion;
        ruleSelected = true;
        tooltipRuleSelection.remove();
        tooltipRuleSelection = null;
        startLineSelectionForRuleLine = lineNo;
        line.clearHint();
        line.setRuleName(suggestion);

        highlightFormulaParts(lineNo,line.getTokenTypeFromRuleName(suggestion));
        SetCaretPosition(line.getRuleDom(),suggestion.length);
        //checkRule(lineNo);
        return;
    }

    // handle weakest operator help
    if (that.nodeName == 'SPAN'){
        console.log('span clicked')
        if (tooltipToken) {
            tooltipToken.remove();
            tooltipToken = null;
        }
        if (bQuickRule && that.classList.contains('mainOp') && (
            that.classList.contains('tokenAnd') || 
            that.classList.contains('tokenImpl') ||
            that.classList.contains('tokenOr') ||
            that.classList.contains('tokenNot')
            )){
            const lineNo = parseInt(that.closest('.line').dataset.lineNumber);
            createToolTipToken(that,editor.getLine(lineNo));
            return;
        }
        that = event.target.parentNode;
    }


    if (tooltipElem) {
        tooltipElem.remove();
        tooltipElem = null;
    }
    
    switch (event.type) {
        case 'mousedown':
            if (startLineSelectionForRuleLine !== null) {
                const lineNo = parseInt(that.dataset.lineNumber);
                if (lineNo < startLineSelectionForRuleLine) {
                    const selectedLine = editor.getLine(lineNo);
                    const ruleLine = editor.getLine(startLineSelectionForRuleLine);
                    const rule = ruleLine.getRuleDom();
                    const ruleLines = rule.textContent.split(':')[1].trim();
                    let comma = '';
                    if (ruleLines.length > 0 && ruleLines[ruleLines.length-1] != ','){
                        comma = ',';
                    }
                    // check if subproof was selected

                    let newNode;
                    if (selectedLine.level > ruleLine.level) {
                        console.log('selected suproof')
                        const sp = editor.getProof().getSubproofByLineNumber(lineNo);
                        const spLastLineNo = lineNo + sp.stepNo-1;
                        newNode =  document.createTextNode(`${comma}${lineNo}-${spLastLineNo}`);                       
                    } else {
                        newNode = document.createTextNode(`${comma}${lineNo}`);
                    }
                    
                    console.log('line selected for rule')
                    const range = window.getSelection().getRangeAt(0);
                    range.insertNode(newNode);
                    range.collapse();
                    
                    checkRule(startLineSelectionForRuleLine);
                    
                    event.preventDefault();
                    return;
                }
            }
            if (that.classList.contains('rule')) {
                that.contentEditable = 'true';
                break;
            }
            editor.selectedLines = null;
            mousedown = event;
            if(editor.activeLine !== null){
                editor.activeLine.contentEditable = 'false';
            }
            break;
        case 'mouseup':
           
            if (that.classList.contains('rule'))
                return;

            if (that.parentElement.classList.contains('settings') || that.classList.contains('closeSettings')) {
                console.log('toggle settings')
                document.getElementById('settings').classList.toggle('showSettings');
            }

            if (that.classList.contains('ruleDefinitions')) {
                console.log('open rules')
                document.getElementById('fitchRules').classList.toggle('showRules');
                document.getElementById('settings').classList.remove('showSettings');
            }
            if (that.classList.contains('closeRules')) {
                console.log('close rules')
                document.getElementById('fitchRules').classList.remove('showRules');
            }


            if (tooltipToken) {
                tooltipToken.remove();
                tooltipToken = null;

                // Tactics
                if (that.classList.contains('intro')){
                    // INTRO Rules
                    let lineNo = parseInt(event.target.dataset.lineNumber);
                    const line = editor.getLine(lineNo);
                    if (line.isPremise || line.getDom().classList.contains('fitchline')) {
                        // don't allow intro for premises and asumptions
                        return;
                    }
                    const formula = line.formula;

                    if (formula instanceof FormulaAnd) {
                        console.log('Insert AND INTRO', formula);
                        for (const term of formula.terms){
                            editor.addLine(String(term),lineNo++,false,line.level,true);
                        }
                    }

                    if (formula instanceof FormulaImpl) {
                        console.log('Insert IMPL INTRO', formula);
                        editor.addLine('',lineNo++,false,(line.level));
                        editor.addLine(String(formula.left),lineNo++,false,(line.level+1),true);
                        editor.addLine('',lineNo++,false,(line.level+1),true);
                        editor.addLine(String(formula.right),lineNo++,false,(line.level+1),true);
                    }

                    if (formula instanceof FormulaNot) {
                        console.log('Insert NOT INTRO', formula);
                        editor.addLine('',lineNo++,false,(line.level));
                        editor.addLine(String(formula.right),lineNo++,false,(line.level+1),true);
                        editor.addLine('',lineNo++,false,(line.level+1),true);
                        editor.addLine('⊥',lineNo++,false,(line.level+1),true);
                    }

                    
                }
                if (event.target.classList.contains('elim')){
                    let lineNo = parseInt(event.target.dataset.lineNumber);
                    const line = editor.getLine(lineNo);
                    const formula = line.formula;
                    
                    if (formula instanceof FormulaAnd) {
                        console.log('Insert AND ELIM', formula);
                        for (const term of formula.terms){
                            editor.addLine(String(term),++lineNo,false,line.level,true);
                        }
                    }

                    if (formula instanceof FormulaImpl) {
                        console.log('Insert IMPL ELIM', formula);
                        let levelAnte = line.level;
                        if (line.getDom().classList.contains('fitchline')) {
                            levelAnte--;
                        }
                        editor.addLine(String(formula.left),lineNo++,false,levelAnte,true);
                        editor.addLine(String(formula.right),++lineNo,false,line.level,true);
                    }

                    if (formula instanceof FormulaNot && formula.right instanceof FormulaNot) {
                        console.log('Insert NOT ELIM', formula);
                        editor.addLine(String(formula.right.right),++lineNo,false,(line.level),true);
                    }

                    if (formula instanceof FormulaOr) {
                        console.log('Insert OR ELIM', formula);
                        for (const term of formula.terms){
                            editor.addLine(String(term),++lineNo,false,(line.level+1),true);
                            editor.addLine('',++lineNo,false,(line.level+1),true);
                            editor.addLine(tooltipTokenValue,++lineNo,false,(line.level+1),true);
                            editor.addLine('',++lineNo,false,(line.level),true);
                        }
                        editor.addLine(tooltipTokenValue,lineNo,false,(line.level),true);
                    }
                }

                editor.setSyntaxHighlighting(bSyntaxHighlight);
                editor.checkFitchLines();
            }
            
            if (mousedown !== null && Math.abs(mousedown.clientX - event.clientX) < 3){
                // only update if a line was selected
                if (that.classList.contains('line') || that.parentNode.classList.contains('line')){
                    
                    const sel = window.getSelection();
                    if (sel && sel.type == "Range"){
                        console.log('double click select');
                        const range = getHtmlRangePos(that);
                        console.log('selcted range:', range);
                        const lineNo = parseInt(that.dataset.lineNumber);
                        const line = editor.getLine(lineNo);
                        line.setSyntaxHighlighting(false);
                        SetRangePosition(line.getDom(),range[0],range[1]);
                        editor.selectedLines=[line.getDom()];
                        return;
                    }
                    that.contentEditable = 'true';
                    const lineNo = parseInt(that.dataset.lineNumber);
                    const line = editor.getLine(lineNo);
                    const caretPos = getHtmlCaretPos(that)
                    
                    line.setSyntaxHighlighting(false);
                    SetCaretPosition(that,caretPos);
                    console.log(editor.selectedLines)
                    showCaretPos(event);
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

let suggestTokens;
function initSuggestTokens() {
    suggestTokens = new Map();
    suggestTokens.set("∧ And", '∧');
    suggestTokens.set("v Or", '∨');
    suggestTokens.set("¬ Not", '¬');
    suggestTokens.set("∀ For All", '∀');
    suggestTokens.set("∀ Universal", '∀');
    suggestTokens.set("-> Implication", '→');
    suggestTokens.set("<-> Bi-Implication", '↔');
    suggestTokens.set("∃ Exists", '∃');
    suggestTokens.set("⊥ Bottom", '⊥');
}

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
    if (bAutocomplete) {
        for (const identifier of editor.enteredIdentifiers){
            // add already entered terms
            suggestTokens.set(identifier,identifier);
        }
    } 
    for (const [matchstring,token] of suggestTokens){
        if (regex.test(matchstring))
            results.set(token,[matchstring,matchstring.replace(regex,'<b>$1</b>')]);
    }
    
    console.log('match results:', results)

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
    const key = event.key;

    const caretPos = getCaretPosition();
    const lineNo = parseInt(that.dataset.lineNumber);
    switch (key) {
        case ":":
        case "Enter":
            if (tooltipRuleSelection){
                break;
            }
            if (lineNo == editor.numberOfLines){
                // add new line if rule is in last line
                const next = editor.addEmptyLineAfter(lineNo);
                SetCaretPosition(next,0);
            } else {
                const next = editor.getLine(lineNo+1);
                SetCaretPosition(next,0);
            }
            
            enterProcessed = true;
            break;
        case "ArrowDown":
            if (tooltipRuleSelection){
              break;
            }
            if (lineNo < editor.numberOfLines) {
                const next = editor.getLine(lineNo + 1);
                SetCaretPosition(next,editor.caretPos);
            }
            break;
        case "ArrowUp":
            if (tooltipRuleSelection){
                break;
            }
            if (lineNo > 1) {
                const next = editor.getLine(lineNo - 1);
                SetCaretPosition(next,editor.caretPos);
            }
            break;
        case "ArrowLeft":
            if (that.textContent[caretPos-1] == ':'){
                //do not allow past colon
            } else if (that.textContent.trim() == '') {
                // go back to end of line
                const line = editor.getLine(lineNo);
                SetCaretPosition(line,line.content.length);
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
                // const line = editor.getLine(lineNo);
                // line.setSyntaxHighlighting(false);//XXX strip HTML
                // SetCaretPosition(line,line.content.length);
            } else {
                return;
            }
            break
        case "Tab":
            if(tooltipRuleSelection){
                break;
            }
            if(event.shiftKey){
                 // go back to end of line
                console.log('go back to end of line')
                const line = editor.getLine(lineNo);
                SetCaretPosition(line,line.content.length);
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
//XXX FIXME on per line basis
let ruleSelected = false;
function handleKeyupRule(event) {
    const key = event.key;
    const that = event.target;
    const lineNo = parseInt(that.dataset.lineNumber);

    if (tooltipRuleSelection) {
        tooltipRuleSelection.remove();
        tooltipRuleSelection = null;
    }
    if (that.textContent.trim().length == 0) {
        that.textContent = '';
        showRuleSelection(that,event.key);
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
    }

    if (triggerAutocompletion) {
        let searchString = that.textContent;
        console.log('search', searchString)
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
                    tooltipHtml += `<li data-line='${lineNo}' data-rule='${results[i][0]}' class='tooltipHighlight'>${description}</li>`;
                else
                    tooltipHtml += `<li data-line='${lineNo}' data-rule='${results[i][0]}'>${description}</li>`;
            }
            tooltipHtml += '</ul>';
            tooltipRuleSelection = document.createElement('div');
            tooltipRuleSelection.className = 'tooltipRule';
            tooltipRuleSelection.innerHTML = tooltipHtml;
            document.body.append(tooltipRuleSelection);

            // position it below line
            const coords = that.getBoundingClientRect();
            let left = coords.left;
            if (left < 0) left = 0; // don't cross the left window edge

            let top = coords.top + that.offsetHeight;
            
            tooltipRuleSelection.style.left = left + 'px';
            tooltipRuleSelection.style.top = top + 'px';
            
            if ((key == 'Tab' && !tabProcessed) || key == 'Enter') {
                // rule was selected
                const suggestion = results[selectionIndex][0];
                that.textContent = suggestion;
                tooltipRuleSelection.remove();
                tooltipRuleSelection = null;
                selectionIndex = 0;
                ruleSelected = true;
                const line = editor.getLine(lineNo);
                line.clearHint();
                line.setRuleName(suggestion);
                highlightFormulaParts(lineNo,line.getTokenTypeFromRuleName(suggestion));
                SetCaretPosition(that,suggestion.length);
            }
            if (key == 'Escape') {
                tooltipRuleSelection.remove();
                tooltipRuleSelection = null;
                currentToken = null;
            }
    }

    if (ruleSelected){
        checkRule(lineNo);
    }
}

function checkRule(lineNo){
    const currentLine = editor.getLine(lineNo);
    const tokens = new Scanner(currentLine.getRuleDom().textContent, lineNo).scanTokens();
    
    const ruleLineNumbers = new Set();
    for (let i=0; i<tokens.length; i++) {
        if (tokens[i].type == TokenType.NUMBER){
            ruleLineNumbers.add(tokens[i].literal);
            // check for number range i.e. 3-6
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
    document.querySelectorAll('.line').forEach(line => {
        line.classList.remove('selectedLine');
    });

    let lines = [];
    for (let number of ruleLineNumbers) {
        const line = editor.getLine(number);
        // highlight selected lines for current rule
        if (line) {
            line.getDom().classList.add('selectedLine');
            line.unDimLine();
            lines.push(line.formula);
        }
    }

    const indexColon = currentLine.ruleName.indexOf(':');
    const rule = currentLine.ruleName.substring(0,indexColon);
    switch (rule) {
        case "∧ Intro": {
                console.log('AND Intro selected');
                const rule = new RuleAndIntro(...lines);
                const line = editor.getLine(lineNo);
                line.clearHint();
                if (line) {
                    highlightFormulaParts(lineNo,TokenType.AND ,...lines);
                    line.setRule(rule);
                    line.setRuleLines(lines);
                }
            }
        break;
        case "→ Intro": {
                console.log('→ Intro selected');
                const line = editor.getLine(lineNo);
                let rule = new RuleImplicationIntro();
                if (ruleLineNumbers.size >= 1){
                    const lineNumber = ruleLineNumbers.values().next().value;
                    const subproof = editor.proof.getSubproofByLineNumber(lineNumber);
                    rule = new RuleImplicationIntro(subproof);
                }
                
                if (line) {
                    highlightFormulaParts(lineNo,TokenType.IMPL,...lines);
                    line.setRule(rule);
                    line.setRuleLines(lines);
                }
            }
        break;
        case "Reit": {
                console.log('Reit selected');
                const rule = new RuleReiteration(lines[0]);
                const line = editor.getLine(lineNo);
                if (line) {
                    line.setRule(rule);
                    line.setRuleLines(lines);
                }
            }
        break;
    }
}
let tooltipRuleSelection = null;
function showRuleSelection(that,key) {
    // remove previous visual states
    that.classList.remove('ruleOk');
    that.classList.remove('ruleOpOk');
    that.classList.remove('ruleError');

    const lineNo = parseInt(that.dataset.lineNumber)
    let results = suggestRules('');
    if (results.size == 0)
        return;

    if (key == 'ArrowUp') {
        selectionIndex--;
    } else if (key == 'ArrowDown') {
        selectionIndex++;
    }

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
            tooltipHtml += `<li data-line='${lineNo}' data-rule='${results[i][0]}' class='tooltipHighlight'>${description}</li>`;
        else
            tooltipHtml += `<li data-line='${lineNo}' data-rule='${results[i][0]}'>${description}</li>`;
    }
    tooltipHtml += '</ul>';
    tooltipRuleSelection = document.createElement('div');
    tooltipRuleSelection.className = 'tooltipRule';
    tooltipRuleSelection.innerHTML = tooltipHtml;
    document.body.append(tooltipRuleSelection);

    // position it below line
    const coords = that.getBoundingClientRect();
    let left = coords.left;
    if (left < 0) left = 0; // don't cross the left window edge

    let top = coords.top + that.offsetHeight;
    
    tooltipRuleSelection.style.left = left + 'px';
    tooltipRuleSelection.style.top = top + 'px';
    
    if ((key == 'Tab' || key == 'Enter')) {
        // rule was selected
        const suggestion = results[selectionIndex][0];
        that.textContent = suggestion;
        tooltipRuleSelection.remove();
        tooltipRuleSelection = null;
        selectionIndex = 0;
        ruleSelected = true;
        const line = editor.getLine(lineNo);
        line.clearHint();
        line.setRuleName(suggestion);
        highlightFormulaParts(lineNo,line.getTokenTypeFromRuleName(suggestion));
        SetCaretPosition(that,suggestion.length);
    }
    if (key == 'Escape') {
        tooltipRuleSelection.remove();
        tooltipRuleSelection = null;
        currentToken = null;
    }

}

function handleKeyup(event) {
    editor.caretPos = getCaretPosition();
    caretPos = editor.caretPos;
    const key = event.key;
    const that = event.target;
    if (that.classList.contains('rule')) {
        handleKeyupRule(event);
        return;
    }
    if (that.classList.contains('tooltipTokenValue')){
        tooltipTokenValue = that.value;
        console.log(tooltipTokenValue)
        return;
    }
    if (!that.classList.contains('line')){
        return;
    }

    showCaretPos(event);
    const lineNo = parseInt(that.dataset.lineNumber);

    // get token under caret position
    let currentToken = null;
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
    if (key == '(' && (that.textContent.length == caretPos || that.textContent[caretPos] == ' ')) {
        console.log('parens:',currentToken,caretPos)
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
            if (results.size == 0){
                if (searchString[0].toLowerCase() == searchString[0]){
                    //if search string is a variable try anew
                    // XXX FIXME
                    searchString = searchString.substring(1);
                    currentToken.pos++;
                    results = suggest(searchString);
                }
                if (results.size == 0)
                    return;
            }
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
                console.log('insert suggestion');
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

const indentAmount = '50';
function handleKeydown(event) {
    console.log('keydown')
    enterProcessed = false;
    tabProcessed = false;
    const that = event.target;
    if (event.defaultPrevented) {
        return; // Do nothing if the event was already processed
    }
    if (that.classList.contains('tooltipTokenValue')){
        return;
    }
    const lineNo = parseInt(that.dataset.lineNumber);
    lineKeydown = lineNo;
    if (that.classList.contains('rule')) {
        handleKeydownRule(event);
        return;
    }
    const caretPos = editor.caretPos;
    switch (event.key) {
        case "ArrowLeft":
          console.log('left',lineNo);
          if (lineNo > 1 && caretPos === 0) {
            const next = editor.getLine(lineNo-1);
            SetCaretPosition(next,next.content.length);
          } else {
            return;
          }
          break;
        case "ArrowRight":
          console.log('right',lineNo);
          if (lineNo < editor.numberOfLines && caretPos === that.textContent.length) {
            const next = editor.getLine(lineNo+1);
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
            const next = editor.getLine(lineNo+1);
            SetCaretPosition(next,editor.caretPos);
          } else {
            //add new line if in last line
            const next = editor.addEmptyLineAfter(lineNo);
            SetCaretPosition(next,0);
          }
          break;
        case "ArrowUp":
          if (tooltipElem){
            break;
          }
          console.log('up', lineNo);
          if (lineNo > 1) {
            const next = editor.getLine(lineNo-1);
            SetCaretPosition(next,editor.caretPos);
          }
          break;
        case "Enter":
          if (tooltipElem){
            break;
          }
          console.log('Enter');
          const isLastPremise = that.classList.contains('fitchline');
          const next = editor.addEmptyLineAfter(lineNo);
          
          //split content at cursor position
          const textLeft  = that.textContent.slice(0,caretPos);
          const textRight = that.textContent.slice(caretPos);
          const current = editor.getLine(lineNo);
          current.setContent(textLeft);
          next.setContent(textRight);
          // if cursor was at end of line and it was the last premise create a new step instead of a new premise
          if (textRight.trim().length == 0 && isLastPremise) {
            next.setIsPremise(false);
          }
          SetCaretPosition(next,0);
          enterProcessed = true;
          break;
        case "Tab":
          if (tooltipElem){
            break;
          }

          console.log('Tab');
          //rule selection
          // jump to rule selection if at end of line
          if(that.textContent.trim().length > 0 && caretPos == that.textContent.length){
            console.log('jump to rule selection')
            tabProcessed = true;
            if(that.nextElementSibling) {
                that.nextElementSibling.contentEditable = 'true';
                that.nextElementSibling.focus();
            }
            break;
          }
          const line = editor.getLine(lineNo);
          let indentLevel = line.level;
            if (event.shiftKey == true){
                if (indentLevel > 0) {
                    //close subproof
                    line.setLevel(--indentLevel);
                    dimLines(line.lineNumber);
                }
            } else {
                if (line.isPremise) {
                    tabProcessed = true;
                    break;
                }
                // check level of previous line
                const levelPrevLine = (lineNo > 1) ? editor.getLineByNumber(lineNo-1).dataset.level : 0;
                if (levelPrevLine < indentLevel) {
                    //do nothing since only one subproof level is allowed
                    tabProcessed = true;
                    break;
                }
                //open subproof
                line.setLevel(++indentLevel);
                dimLines(line.lineNumber);
            }
          tabProcessed = true;
          break;
        case "Backspace":
            {
                console.log('Backspace');
                const sel = window.getSelection();
                if (sel.type === "Caret") {
                    const range = sel.getRangeAt(0);
                    if (range.startOffset == 0) {
                        const line = editor.getLine(lineNo);
                        let indentLevel = line.level;
                        // close subproof
                        if (indentLevel > 0){
                            line.setLevel(--indentLevel);
                            dimLines(lineNo);
                            return;
                        } else {
                           if (lineNo > 0) {
                                const text = that.textContent;
                                editor.removeLine(lineNo);
                                const next = editor.getLine(lineNo - 1);
                                const cursorPos = next.content.length;
                                next.setContent(next.content + text);
                                SetCaretPosition(next, cursorPos);
                                // event handled, don't delete any character on next line!
                                break;
                            }
                        }
                    } else {
                        // if cursor was not at the beginnig of the current line
                        return;
                    }
                }
            }
          //break; intentionally Fall through to delete for user selections...
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
                    const startLine = editor.getLine(editor.selectedLines[0].dataset.lineNumber);
                    const caretPos = getHtmlCaretPos(startLine.getDom());
                    range.deleteContents();
                    editor.undoStack.push(['content',startLine.copy(),new Date(),caretPos]);
                    const firstLineId = editor.selectedLines[0].id;
                    const firstLineAfterDeletion = document.getElementById(firstLineId);
                    const lastLineId = editor.selectedLines[editor.selectedLines.length-1].id;
                    const lastLineAfterDeletion = document.getElementById(lastLineId);
                    if (!firstLineAfterDeletion.nextElementSibling && editor.selectedLines[0].nextElementSibling){
                        // if rule selection is missing, add it again
                        firstLineAfterDeletion.parentNode.append(editor.selectedLines[0].nextElementSibling);
                    }

                    let removedLines = [];

                    //delete selected lines in descending order
                    const numLines = editor.selectedLines.length;
                    for (let i=numLines-1; i>=0; i--) {
                        const line = editor.selectedLines[i];
                        const lineNo = parseInt(line.dataset.lineNumber);
                        const lineAfterEdit = editor.getLineByNumber(lineNo);
                        if (!lineAfterEdit || lineAfterEdit.textContent.trim().length == 0) {
                            editor.removeLine(lineNo)
                            removedLines.push(lineNo);
                        }

                    }
                    const lastLineNo = parseInt(editor.selectedLines[editor.selectedLines.length-1].dataset.lineNumber);
                    if (removedLines.length == editor.selectedLines.length){
                        if (editor.lines.length == 2) {
                            //XXX FIXME if every line was deleted add last step to the DOM;
                            editor.addLine(editor.lines[1].content);
                            editor.removeLine(2);
                        }
                        //all selected lines have been removed
                        //focus next line after last selected line
                        let nextLineNo = lastLineNo + 1;
                        if (nextLineNo > editor.numberOfLines){
                            //select line before first selected line
                            nextLineNo = startLine.lineNumber - 1;
                            if (nextLineNo < 1)
                                nextLineNo = 1;
                            const line = editor.getLine(nextLineNo);
                            SetCaretPosition(line,line.content.length);
                        } else {
                            const line = editor.getLine(nextLineNo);
                            SetCaretPosition(line,0);
                        }
                    } else {
                        if (firstLineAfterDeletion.textContent.trim() != ''){
                            startLine.setContent(firstLineAfterDeletion.textContent);
                        } 
                        if (lastLineAfterDeletion.textContent.trim() != '') {
                            const line = editor.getLine(lastLineNo - removedLines.length);
                            editor.undoStack.push(['content',line.copy(),new Date(),caretPos]);
                            line.setContent(lastLineAfterDeletion.textContent);
                            SetCaretPosition(line,0);
                        } else {
                            SetCaretPosition(startLine,caretPos);
                        }
                    }
                } else if(editor.selectedLines !== null && editor.selectedLines.length == 1){
                    const lineNo = parseInt(editor.selectedLines[0].dataset.lineNumber);
                    const line = editor.getLine(lineNo)
                    const caretPos = getHtmlCaretPos(editor.selectedLines[0]);
                    editor.undoStack.push(['content',line.copy(),new Date(),caretPos]);
                    range.deleteContents();
                    line.setContent(editor.selectedLines[0].textContent);
                    SetCaretPosition(line,caretPos);
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
            console.log('r',lineNo);
            if (that.textContent.trim().length > 0 && event.ctrlKey === true ) {
                console.log('jump to rule');
                if(that.nextElementSibling) {
                    that.nextElementSibling.contentEditable = 'true';
                    that.nextElementSibling.focus();
                }
            break;
            }
            if (event.ctrlKey)
                return;
        case "z":
            //undo last event
            console.log('z',lineNo);
            if (event.ctrlKey === true) {
                console.log('undo');
                const line = editor.getLine(lineNo);
                if (!line || line && line.content === that.textContent) {
                    editor.undo();
                    break;
                } 
            }
            return;
        case "y":
            //redo last event
            console.log('y',lineNo);
            if (event.ctrlKey === true) {
                console.log('redo');
                const line = editor.getLine(lineNo);
                // XXX FIXME
                if (!line || line && line.content === that.textContent) {
                    editor.redo();
                    break;
                } 
            }
            return;
        case "d":
            //delete current line
            console.log('d',lineNo);
            if (lineNo > 0 && event.ctrlKey === true ) {
                console.log('delete line');
                const next = editor.removeLine(lineNo);
                if (next !== null)
                    SetCaretPosition(next,editor.caretPos);
                break;
            } 
        default:
            if (event.ctrlKey || event.key == 'Shift')
                return;
            
            const sel = window.getSelection();
            if (sel.type === 'None')
                return;
            if (sel.type === 'Range') {
                const range = sel.getRangeAt(0);
                // if a range was selected and any character was typed
                if(editor.selectedLines !== null && editor.selectedLines.length == 1){
                    const lineNo = editor.selectedLines[0].dataset.lineNumber;
                    const caretPos = getHtmlCaretPos(editor.selectedLines[0]);
                    range.deleteContents();
                    const line = editor.getLine(lineNo);
                    editor.undoStack.push(['content',line.copy(),new Date(),caretPos]);
                    line.setContent(editor.getLineByNumber(lineNo).textContent);
                    SetCaretPosition(line,caretPos);
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
       const newLine = editor.addEmptyLineAfter(currentLine++);
       newLine.setContent(lines[i]);
       newLine.setLevel(indentLevel);
       lastLine = newLine;
    }
    SetCaretPosition(lastLine,lastLine.content.length);
}

function handleBlur(event) {
    console.log('focusout')
    const that = event.target;
    const lineNo = parseInt(that.dataset.lineNumber);
    if (that.classList.contains('rule')){
        //clean up
        document.querySelectorAll('.line').forEach(line => {
            line.classList.remove('selectedLine');
        });
        //remove whitespace and rule highlight colours
        if(that.textContent.trim() == ''){
            that.textContent='';
            that.classList.remove('ruleError');
            that.classList.remove('ruleOk');
            that.classList.remove('ruleOpOk');
        }
        // remove highlights/hints
        const line = editor.getLine(lineNo);
        line.setSyntaxHighlighting(bSyntaxHighlight);
        line.clearHint();
        // remove tooltip
        if (tooltipRuleSelection) {
            tooltipRuleSelection.remove();
            tooltipRuleSelection = null;
        }
        // disable line selection for rule
        startLineSelectionForRuleLine = null;
        that.contentEditable = 'false';

    }
    if (that.classList.contains('line')) {
        const line = editor.getLine(lineNo);
        //update content based on text changes
        line.setContent(that.textContent);
        line.setSyntaxHighlighting(bSyntaxHighlight);
    }
    editor.checkFitchLines();
    editor.checkProof();
}

function handleFocus(event) {
    console.log('focusin')
    const that = event.target;
    const lineNo = parseInt(that.dataset.lineNumber);
    if (that.classList.contains('rule')) {
        const line = editor.getLine(lineNo);
        startLineSelectionForRuleLine = lineNo;
        highlightFormulaParts(lineNo,line.getTokenTypeFromRuleName(),...line.ruleLines);
        //if rule was already selected, start at end
        if (that.textContent.length > 0){
            const indexColon = that.textContent.indexOf(':');
            if (indexColon >= 0){
                SetCaretPosition(that,that.textContent.length);
                ruleSelected = true;
                checkRule(lineNo);
            }
        } else {
            ruleSelected = false;
            showRuleSelection(that,event.key);
            if (line.formula) {
                const formula = line.formula;
                if (!(formula instanceof FormulaEquality || formula instanceof Predicate))
                    line.showHint("Please identify the 'weakest' operator of this formula and select the corresponding rule");
            }
        }
    }
    if (that.classList.contains('line')) {
        const line = editor.getLine(lineNo);
        editor.selectedLines = [that];
        // check current level and dim other subproofs if any
        dimLines(lineNo);
        line.setSyntaxHighlighting(false);

    }
}

function dimLines(lineNo){
    if (!bDimLines)
        return;
    const currentLine = editor.getLine(lineNo);
    currentLine.unDimLine();
    const startLevel = currentLine.level;
    let descented = false
    // undim next lines of same suproof level 
    for (let nextLineNo = lineNo+1; nextLineNo <= editor.numberOfLines; nextLineNo++ ){
        const line = editor.getLine(nextLineNo);
        if (!descented && line.level == startLevel){
            line.unDimLine();
            continue;
        }
        if (descented){
            line.dimLine()
            continue;
        }
        if (line.level > startLevel){
            line.dimLine();
        }
        if (line.level < startLevel){
            descented = true;
            line.dimLine();
        }
    }

    let currentLevel = startLevel;

    // dim previous lines if not in same subproof
    for (let prevLine = lineNo-1; prevLine > 0; prevLine-- ){
        const line = editor.getLine(prevLine);
        if (line.level == currentLevel){
            line.unDimLine()
            continue;
        }

        if (line.level > currentLevel) {
            line.dimLine();
        }
        if (line.level < currentLevel) {
            line.unDimLine()
            currentLevel = line.level;
        }
        if (line.isPremise)
            break;
    }
}

function handleProblemChanged(event) {
    console.log("Problem changed to:", event.target.value);
    if (event.target.value) {
        switch (event.target.value){
            case "1.1":
                editor = null;
                editor = new Editor();
                editor.addPremise('Peter');
                editor.addPremise('Leo');
                editor.addLine('Peter ∧ Leo');
                editor.addLine('∀x∀y(Peter(x,y) ∧ Hans(y)) → ∃z(Leo(z))');
                editor.addLine('¬∀x∀y(Peter(x) ∧ Hans(y)) → ∃z(Leo(z))');
                editor.addLine('hans = peter');
                editor.addLine('Hans ∨ Peter ∨ Leo');
                for (var i = 0; i < 20; i++) {
                    editor.addLine('');
                }
                editor.setSyntaxHighlighting(bSyntaxHighlight);
                editor.checkFitchLines();
                editor.undoStack = [];
            break;
            case "1.2":
                editor = null;
                editor = new Editor();
                editor.addPremise('Parent(leo,peter)');
                editor.addPremise('Female(leo)');
                editor.addPremise('∀x∀y((Parent(x,y) ∧ Female(x)) → Mother(x,y))');
                editor.addLine('Parent(leo,peter) ∧ Female(leo)');
                editor.addLine('Mother(leo,peter)');
                for (var i = 0; i < 20; i++) {
                    editor.addLine('');
                }
                editor.setSyntaxHighlighting(bSyntaxHighlight);
                editor.checkFitchLines();
                editor.undoStack = [];
            break;
            case "1.3":
                editor = null;
                editor = new Editor();
                editor.addPremise('Parent(leo,peter)');
                editor.addPremise('Female(leo)');
                editor.addLine('Parent(leo,peter) ∧ Female(leo)');
                for (var i = 0; i < 20; i++) {
                    editor.addLine('');
                }
                editor.setSyntaxHighlighting(bSyntaxHighlight);
                editor.checkFitchLines();
                editor.undoStack = [];
            break;
            case "1.4":
            break;
        }
    }
}



let bSyntaxHighlight = true;
let bSyntaxErrors = true;
let bAutocomplete = true;
let bHighlightMainOp = true;
let bDimLines = true;
let bQuickRule = true;
let bRuleHints = true;

function handleSettings(event) {
    switch(event.target.id) {
        case "cb1":
            bSyntaxHighlight = !bSyntaxHighlight;
            for (const line of editor.lines){
                line.setSyntaxHighlighting(bSyntaxHighlight);
            }
        break;
        case "cb2":
            bSyntaxErrors = !bSyntaxErrors;
        break;
        case "cb3":
            bAutocomplete = !bAutocomplete;
            initSuggestTokens();
        break;
        case "cb4":
            bHighlightMainOp = !bHighlightMainOp;
            for (const line of editor.lines){
                line.setSyntaxHighlighting(bSyntaxHighlight,true);
            }
        break;
        case "cb5":
            bDimLines = !bDimLines;
            if (!bDimLines) {
                for (const line of editor.lines){
                    line.unDimLine();
                }
            }
        break;
        case "cb6":
            bQuickRule = !bQuickRule;
        break;
        case "cb7":
            bRuleHints = !bRuleHints;
        break;
    }
}

let editor = new Editor();
window.addEventListener("load", function(){
    initSuggestTokens();
    const problem = document.getElementById('currentProblem');
    problem.addEventListener('change', handleProblemChanged);
    const settings = document.getElementById('settings');
    settings.addEventListener('change', handleSettings);


    const ed = document.getElementById('editor');
    
    ed.addEventListener('paste', handlePaste);
    ed.addEventListener("focusout", handleBlur);
    ed.addEventListener("focusin", handleFocus);
    // because of range selection with mouse
    document.addEventListener("keydown", handleKeydown);
    document.addEventListener('keyup', handleKeyup);

    //register on window to capture mouseups everywhere (i.e. if user selects fast or imprecisely)
    window.addEventListener("mousedown", handleMouse);
    window.addEventListener('mouseup', handleMouse);
    
    editor.addPremise('Peter');
    editor.addPremise('Leo');
    editor.addLine('Peter ∧ Leo');
    editor.addLine('∀x∀y(Peter(x,y) ∧ Hans(y)) → ∃z(Leo(z))');
    editor.addLine('¬∀x∀y(Peter(x) ∧ Hans(y)) → ∃z(Leo(z))');
    editor.addLine('hans = peter');
    editor.addLine('Hans ∨ Peter ∨ Leo');
    for (var i = 0; i < 20; i++) {
        editor.addLine('');
    }
    editor.setSyntaxHighlighting(bSyntaxHighlight);
    editor.checkFitchLines();
    editor.undoStack = [];

    //editor.getProof().check();
    // show settings panel at start
    document.getElementById('settings').classList.toggle('showSettings');
});


function parseText(text){
    return new Parser(new Scanner(text.trim(),0).scanTokens()).parse();
}

function parseLineDiv(div) {
    const text = div.textContent.trim();

    if ( text != '' && div.dataset.lineNumber){
          console.log('check line')
          const parsedFormula = new Parser(new Scanner(text,div.dataset.lineNumber).scanTokens()).parse();
          if (parsedFormula) {
              console.log(parsedFormula)
              div.classList.add('lineOk');
              div.classList.remove('lineError');
              return parsedFormula;
          } else {
              div.classList.add('lineError');
              div.classList.remove('lineOk');
              return null;
              console.log('no valid formula in line', div.dataset.lineNumber)
          }
    }
}

// Move caret to a specific point in a DOM element
function SetCaretPosition(el, pos){
    console.log('caret', pos, el)
    if (!el)
        return -1;
    if (el instanceof Line){
        el.setSyntaxHighlighting(false);
        el = el.getDom();
    } else {
        el.textContent = el.textContent;
    }
    if (el.classList.contains('line')){
        editor.selectedLines = [el];
        el.contentEditable = 'true';
        if(editor.activeLine && editor.activeLine != el){
                editor.activeLine.contentEditable = 'false';
        }
        editor.activeLine = el;
    }
    
    if (el.childNodes.length == 0) {
        el.appendChild(document.createTextNode(''));           
    }
    //XXX FIXME
    // Loop through all child nodes
    for(let node of el.childNodes){
        if(node.nodeType == 3){ // we have a text node
            pos = Math.min(node.length,pos);
            editor.caretPos = pos;
            // finally add our range
            let range = document.createRange(),
                sel = window.getSelection();
            range.setStart(node,pos);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
            return -1; // we are done
            
        }
    }
    return pos; // needed because of recursion stuff
}

function SetRangePosition(element, start, end){
    const textNode = element.childNodes[0];
    const range = document.createRange();
    range.setStart(textNode,start);
    range.setEnd(textNode,end);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}

function getHtmlCaretPos(element){
    const range = window.getSelection().getRangeAt(0);
    const copyRange = range.cloneRange();
    copyRange.selectNodeContents(element);
    copyRange.setEnd(range.endContainer, range.endOffset);
    const endPos = copyRange.toString().trimStart().length;
    if (range.collapsed)
        return endPos;
    //a range was selected, get start position
    copyRange.setEnd(range.startContainer, range.startOffset);
    const startPos = copyRange.toString().trimStart().length;
    return startPos < endPos ? startPos : endPos;
}

function getHtmlRangePos(element){
    const range = window.getSelection().getRangeAt(0);
    const copyRange = range.cloneRange();
    copyRange.selectNodeContents(element);
    copyRange.setEnd(range.endContainer, range.endOffset);
    const endPos = copyRange.toString().trimStart().length;
    copyRange.setEnd(range.startContainer, range.startOffset);
    const startPos = copyRange.toString().trimStart().length;
    return [startPos, endPos];
}

function getCaretPosition() {
    const sel = window.getSelection();
    if (sel) 
        return sel.anchorOffset;
    return -1;
}

function showCaretPos(event) {
  let el = event.target;
  let caretPosEl = document.getElementById("caretPos");
  if (!editor.selectedLines || !caretPosEl)
    return;
  const line = editor.selectedLines[0].dataset.lineNumber;
  caretPosEl.textContent = "Caret position in line: " + line + " at index: " + editor.caretPos; //getCaretCharacterOffsetWithin(el);
}


function highlightFormulaParts(lineNumber,...matches){
    if(!bRuleHints)
        return;
    const matchOperatorClassName = ' highlightOperatorOk';
    const matchFormulaClassName = ' highlightFormulaOk';
    const line = editor.getLine(lineNumber);
    
    if (!line) return;

    const domLine = editor.getLineByNumber(lineNumber);
    const formula = line.formula;
    if (!formula) {
        return;
    }
    
    if (formula instanceof FormulaEquality) return; 

    let matchOperator = null;
    let selectedLines = []
    for (const match of matches){
        if (typeof match == 'number' ) {
            matchOperator = match;
        } else if (match instanceof Formula){
            selectedLines.push(match);
        }
    }

    // try to highlight corresponding logical connective in current formula
    if (formula.connective) {
        // -> / <->
        const connective = formula.connective;
        const offset = connective.pos;
        const length = connective.lexeme.length;
        const content = domLine.textContent;
        const before = content.substring(0,offset);
        const after =  content.substring(offset+length);
        const opMatch = connective.type == matchOperator ? matchOperatorClassName : '';
        const beforeFormula = parseText(before);
        let foundForm = false;
        if (beforeFormula) {
            const matchForm = String(beforeFormula);
            for (const form of selectedLines){
                if (String(form) == matchForm){
                    foundForm = true;
                    break;
                }
            }
        }
        const matchBefore = foundForm ? matchFormulaClassName : '';

        const afterFormula = parseText(after);
        foundForm = false;
        if (afterFormula) {
            const matchForm = String(afterFormula);
            for (const form of selectedLines){
                if (String(form) == matchForm){
                    foundForm = true;
                    break;
                }
            }
        }
        const matchAfter = foundForm ? matchFormulaClassName : '';
        const tokenCss = line.getTokenCssClass(connective);
        domLine.innerHTML = `<span class='connectivePart${matchBefore}'>${before}</span><span class='connectiveHighlightBinary${opMatch} ${tokenCss}'>${connective.lexeme}</span><span class='connectivePart${matchAfter}'>${after}</span>`;
    } else if (formula.connectives) {
        // and / or
        let html = '';
        let content = domLine.textContent;
        let i = 0;
        // FIXME odd number of connectors
        for (const connective of formula.connectives){
            const offset = connective.pos - i;
            const length = connective.lexeme.length;
            const before = content.substring(0,offset);
            const opMatch = connective.type == matchOperator ? matchOperatorClassName : '';
            const beforeFormula = parseText(before);
            let foundForm = false;
            if (beforeFormula) {
                const matchForm = String(beforeFormula);
                for (const form of selectedLines){
                    if (String(form) == matchForm){
                        foundForm = true;
                        break;
                    }
                }
            }
            const formMatch = foundForm ? matchFormulaClassName : '';
            const tokenCss = line.getTokenCssClass(connective);
            html += `<span class='connectivePart${formMatch}'>${before}</span><span class='connectiveHighlightBinary${opMatch} ${tokenCss}'>${connective.lexeme}</span>`;
            i = offset + length;
            content = content.substring(i);
        }
        const beforeFormula = parseText(content);
        let foundForm = false;
        if (beforeFormula) {
            const matchForm = String(beforeFormula);
            for (const form of selectedLines){
                if (String(form) == matchForm){
                    foundForm = true;
                    break;
                }
            }
        }
        const formMatch = foundForm ? matchFormulaClassName : '';
        html += `<span class='connectivePart${formMatch} '>${content}</span>`;
        domLine.innerHTML = html;
    } else if (formula.operator) {
        // not
        const connective = formula.operator;
        const offset = connective.pos;
        const length = connective.lexeme.length;
        const content = domLine.textContent;
        const before = content.substring(0,offset);
        const after =  content.substring(offset+length);
        const opMatch = connective.type == matchOperator ? matchOperatorClassName : '';
        const tokenCss = line.getTokenCssClass(connective);
        domLine.innerHTML = `${before}<span class='connectiveHighlightUnary${opMatch}  ${tokenCss}'>${connective.lexeme}</span><span class='connectivePart'>${after}</span>`;
    } else if (formula.quantifier){
        // universal / existential
        const connective = formula.quantifier;
        const offset = connective.pos;
        const length = formula.variable.pos + formula.variable.lexeme.length;
        const content = domLine.textContent;
        const before = content.substring(0,offset);
        const after =  content.substring(offset+length);
        const opMatch = connective.type == matchOperator ? matchOperatorClassName : '';
        const tokenCss = line.getTokenCssClass(connective);
        domLine.innerHTML = `${before}<span class='connectiveHighlightUnary${opMatch}  ${tokenCss}'>${connective.lexeme}${formula.variable}</span><span class='connectivePart'>${after}</span>`;
    }
}