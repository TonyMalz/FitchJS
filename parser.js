const TokenType = Object.freeze({
    // Single-character tokens.
    LEFT_PAREN:0, RIGHT_PAREN:1, COMMA:2, MINUS:3, PLUS:4, SEMICOLON:5, SLASH:6, STAR:7,

    // One or two character tokens.
    EQUAL:8, GREATER:9, GREATER_EQUAL:10, LESS:11, LESS_EQUAL:12,

    // Literals.
    IDENTIFIER:13, NUMBER:14,

    // Logical tokens
    AND:15, OR:16, NOT:17, TRUE:18, FALSE:19, IMPL:20, BI_IMPL:21, FOR_ALL:22, EXISTS:23,

    EOF:24
});

class Token {
    constructor(type, lexeme, literal, line, pos){
        this.type = type;
        this.lexeme = lexeme;
        this.literal = literal;
        this.line = line;
        this.pos = pos;
    }

    [Symbol.toPrimitive](hint) {
        switch (hint) {
            case "string":
                return this.toString(); 
            case "number":
                return this.type;
            case "default":
                return this.toString();
        }
    }
    toString(){
        switch (this.type) {
            case TokenType.AND:
                return '∧';
            case TokenType.OR:
                return '∨';
            case TokenType.NOT:
                return '¬';
            case TokenType.TRUE:
                return '⊤';
            case TokenType.FALSE:
                return '⊥';
            case TokenType.IMPL:
                return '→';
            case TokenType.BI_IMPL:
                return '↔';
            case TokenType.FOR_ALL:
                return '∀';
            case TokenType.EXISTS:
                return '∃';
        }
        return this.lexeme;
    }
};



class Scanner {
    constructor(source, line){
        this.source = source;
        this.line = line;

        this.keywords = new Map();
        this.keywords.set("and", TokenType.AND);
        this.keywords.set("or", TokenType.OR);
        this.keywords.set("not", TokenType.NOT);
        this.keywords.set("FA", TokenType.FOR_ALL);
        this.keywords.set("EX", TokenType.EXISTS);
        this.keywords.set("bottom", TokenType.FALSE);
        this.keywords.set("false", TokenType.FALSE);
        this.keywords.set("true", TokenType.TRUE);
        this.keywords.set("iff", TokenType.BI_IMPL);

        this.start = 0;
        this.current = 0;

        this.tokens = [];
    }

    scanTokens() {
        while (! this.isAtEnd()) {
            // We are at the beginning of the next lexeme.
            this.start = this.current;
            this.scanToken();
        }
        this.tokens.push(new Token(TokenType.EOF, "", null, this.line, this.start));
        return this.tokens;
    }
    
    isAtEnd() {
        return this.current >= this.source.length;
    }

    scanToken() {
        const c = this.advance();
        switch (c) {
            case '(' :
                this.addToken(TokenType.LEFT_PAREN);
                break;
            case ')' :
                this.addToken(TokenType.RIGHT_PAREN);
                break;
            case ',' :
                this.addToken(TokenType.COMMA);
                break;
            case '-' :
                this.addToken(match('>') ? TokenType.IMPL : TokenType.MINUS);
                break;
            case '+' :
                this.addToken(TokenType.PLUS);
                break;
            case ';' :
                this.addToken(TokenType.SEMICOLON);
                break;
            case '*' :
                this.addToken(TokenType.STAR);
                break;
            case '!' :
                this.addToken(TokenType.NOT);
                break;
            case '∧' :
                this.addToken(TokenType.AND);
                break;
            case '∨' :
                this.addToken(TokenType.OR);
                break;
            case '¬' :
                this.addToken(TokenType.NOT);
                break;
            case '→' :
                this.addToken(TokenType.IMPL);
                break;
            case '∀' :
                this.addToken(TokenType.FOR_ALL);
                break;
            case '∃' :
                this.addToken(TokenType.EXISTS);
                break;
            case '⊤' :
                this.addToken(TokenType.TRUE);
                break;
            case '⊥' :
                this.addToken(TokenType.FALSE);
                break;
            case '↔' :
                this.addToken(TokenType.BI_IMPL);
                break;
            case '⇔' :
                this.addToken(TokenType.BI_IMPL);
                break;
            case '=' :
                this.addToken(match('>') ? TokenType.IMPL : TokenType.EQUAL);
                break;
            case '<' :
                if (this.match('=')) {
                    if (this.match('>'))
                        this.addToken(TokenType.BI_IMPL);
                    else
                        this.addToken(TokenType.LESS_EQUAL);
                } else if (this.match('-') && this.match('>') )
                    this.addToken(TokenType.BI_IMPL);
                else
                    this.addToken(TokenType.LESS);
                break;
            case '>' :
                this.addToken(this.match('=') ? TokenType.GREATER_EQUAL : TokenType.GREATER);
                break;
            case '/' :
                if (this.match('/')) {
                    // A comment goes until the end of the line.
                    while (this.peek() != '\n' && !this.isAtEnd())
                        this.advance();
                } else {
                    this.addToken(TokenType.SLASH);
                }
                break;

            case ' ' :
            case '\r' :
            case '\t' :
                // Ignore whitespace.
                break;

            case '\n' :
                
                //this.line++;
                break;

            default :
                if (this.isDigit(c)) {
                    this.number();
                } else if (this.isAlpha(c)) {
                    this.identifier();
                } else {
                    // TODO: coalesce all invalid characters?
                    //Fitch.error(line, "Unexpected character.");
                }
                break;
        }
    }

    isDigit(c) {
        return c >= '0' && c <= '9';
    }

    isAlpha(c) {
        return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == '_';
    }

    isAlphaNumeric(c) {
        return this.isAlpha(c) || this.isDigit(c);
    }

    identifier() {
        while (this.isAlphaNumeric(this.peek()))
            this.advance();

        // See if the identifier is a reserved word.
        const text = this.source.substring(this.start, this.current);

        let type = this.keywords.get(text);
        if (type == null)
            type = TokenType.IDENTIFIER;
        this.addToken(type);
    }

    number() {
        while (this.isDigit(this.peek()))
            this.advance();

        // Look for a fractional part.
        if (this.peek() == '.' && this.isDigit(this.peekNext())) {
            // Consume the "."
            this.advance();

            while (this.isDigit(this.peek()))
                this.advance();
        }

        this.addToken(TokenType.NUMBER, parseFloat(this.source.substring(this.start, this.current)));
    }

    advance() {
        return this.source.charAt(this.current++);
    }

    addToken(type, literal = null) {
        const text = this.source.substring(this.start, this.current);
        this.tokens.push(new Token(type, text, literal, this.line, this.start));
    }

    match(expected) {
        if (this.isAtEnd())
            return false;
        if (this.source.charAt(this.current) != expected)
            return false;

        this.current++;
        return true;
    }

    peek() {
        if (this.isAtEnd())
            return '\0';
        return this.source.charAt(this.current);
    }

    peekNext() {
        if (this.current + 1 >= this.source.length)
            return '\0';
        return this.source.charAt(this.current + 1);
    }
};

class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.current = 0;
    }

    error(token, message) {
        //XXX Fitch.error(token, message);
        return new ParseError(token, message);
    }

    match(...types){
        for (const type of types) {
            if (this.check(type)) {
                this.advance();
                return true;
            }
        }
        return false;
    }

    advance(){
        if (!this.isAtEnd()) this.current++;
        return this.previous();
    }

    peek(){
        return this.tokens[this.current];
    }

    previous() {
        return this.tokens[this.current-1];
    }

    consume(type, message) {
        if (this.check(type)) return this.advance();
        throw this.error(this.peek(), message);
    }

    isAtEnd() {
        return this.peek().type == TokenType.EOF;
    }

    check(tokenType) {
        if (this.isAtEnd()) return false;
        return this.peek().type == tokenType;
    }

    synchronize() {
        this.advance();
        while (!this.isAtEnd()) {
            if (this.previous().type == TokenType.SEMICOLON) return;
            this.advance();
        }
    }

    parse(){
        try {
            const form = this.formula(true);
            this.checkIsAtEOF();
            return form;
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    checkIsAtEOF(){
        if(this.peek().type != TokenType.EOF){
            throw this.error(this.peek(), "Unexpected token");
        }
    }

    // recursive decent parsing ahead

    formula(first) {
        if (this.match(TokenType.NOT)) {
            const operator = this.previous();
            const right = this.formula(false);
            return new FormulaNot(operator, right);
        }

        if (this.match(TokenType.LEFT_PAREN)) {
            const left = this.formula(false);

            if (this.match(TokenType.IMPL)) {
                const connective = this.previous();
                const right = this.formula(false);
                this.consume(TokenType.RIGHT_PAREN, "Expected ')' after expression.");
                return new FormulaImpl(left, connective, right);
            }

            if (this.match(TokenType.BI_IMPL)) {
                const connective = this.previous();
                const right = this.formula(false);
                this.consume(TokenType.RIGHT_PAREN, "Expected ')' after expression.");
                return  new FormulaBiImpl(left, connective, right);
            }

            if (this.match(TokenType.AND)) {
                const formulas = [];
                const connectives = [];
                formulas.push(left);
                connectives.push(this.previous());
                formulas.push(this.formula(false));
                while (this.match(TokenType.AND)){
                    connectives.push(this.previous());
                    formulas.push(this.formula(false));
                }
                this.consume(TokenType.RIGHT_PAREN, "Expected ')' after expression.");
                return new FormulaAnd(formulas,connectives);
            }

            if (this.match(TokenType.OR)) {
                const formulas = [];
                const connectives = [];
                formulas.push(left);
                connectives.push(this.previous());
                formulas.push(this.formula(false));
                while (this.match(TokenType.OR)){
                    connectives.push(this.previous());
                    formulas.push(this.formula(false));
                }
                this.consume(TokenType.RIGHT_PAREN, "Expected ')' after expression.");
                return new FormulaOr(formulas, connectives);
            }

            this.consume(TokenType.RIGHT_PAREN, "Expected ')' after expression.");
            return left;
        }// LEFT_PAREN

        if (this.match(TokenType.EXISTS,TokenType.FOR_ALL)) {
            const quantifier = this.previous();
            if(this.match(TokenType.IDENTIFIER)) {
                const variable = this.previous();
                const right = this.formula(false);
                return new FormulaQuantified(quantifier, variable, right);
            }
            throw this.error(peek(),"Expected a variable after quantification.");
        }

        const term = this.term();
        if (this.match(TokenType.EQUAL)){
            const connective = this.previous();
            const right = this.term();
            return new FormulaEquality(term,connective,right);
        }

        // variable first is a hack to accommodate for the lax syntax used in tutorials:
        // for AND and OR on the first level of the formula, parenthesis can be omitted
        if (first === true) {
            if (this.match(TokenType.AND)) {
                const formulas = [];
                const connectives = [];
                formulas.push(term);
                connectives.push(this.previous());
                formulas.push(this.formula(false));
                while (this.match(TokenType.AND)){
                    connectives.push(this.previous());
                    formulas.push(this.formula(false));
                }
                return new FormulaAnd(formulas,connectives);
            }
            if (this.match(TokenType.OR)) {
                const formulas = [];
                const connectives = [];
                formulas.push(term);
                connectives.push(this.previous());
                formulas.push(this.formula(false));
                while (this.match(TokenType.OR)){
                    connectives.push(this.previous());
                    formulas.push(this.formula(false));
                }
                return new FormulaOr(formulas, connectives);
            }
        }
        return term;
    }//formula

    term(){
        if(this.match(TokenType.TRUE, TokenType.FALSE, TokenType.NUMBER)){
            return new TermConstant(this.previous());
        }
        if(this.match(TokenType.IDENTIFIER)){
            const identifier = this.previous();
            if (this.match(TokenType.LEFT_PAREN)){
                //FIXME allow arity 0 => Tet() ?
                if (this.match(TokenType.RIGHT_PAREN)) {
                    console.log('empty arg list');
                    return new TermFunction(identifier,[]);
                }
                const terms = this.term_list();
                this.consume(TokenType.RIGHT_PAREN,"Expected ')' after argument list.");
                return new TermFunction(identifier,terms);
            }
            return new TermVariable(identifier);
        }
        throw this.error(this.peek(), "Expected a term.");
    }

    term_list(){
        const terms = [];
        const term = this.term();
        terms.push(term);
        while (this.match(TokenType.COMMA)){
            terms.push(this.term());
        }
        return terms;
    }
}

class ParseError extends Error {
  constructor(token, ...params) {
    super(...params);
    this.token = token;
    this.date = new Date();
  }
}


class Formula {
    constructor(){
        this.isPremise = false;
        this.isConclusion = false;
        this.isValid = false;
        this.rule = null;
        this.line = 0;
    }
    checkRule(){
        if (! this.rule instanceof Rule){
            console.error('no rule given');
            return false;
        }
        return this.rule.validate(this);
    }
    setRule(rule) {
        this.rule = rule;
    }
}

class FormulaUnary extends Formula {
    constructor(operator, right) {
        super();
        this.operator = operator; //Token
        this.right = right;
        this.line = operator.line;
    }
    toString(){
        return this.operator + this.right;
    }
}
class FormulaNot extends FormulaUnary {
}
class FormulaBinary extends Formula {
    constructor(left, connective, right) {
        super();
        this.left = left;
        this.connective = connective; //Token
        this.right = right;
        this.line = left.line;
    }
    toString(){
        return '( ' + this.left + ' ' + this.connective + ' ' + this.right + ' )';
    }
}
class FormulaImpl extends FormulaBinary {
}
class FormulaBiImpl extends FormulaBinary {
}
class FormulaEquality extends FormulaBinary {
}
class FormulaQuantified extends Formula {
    constructor(quantifier, variable, right) {
        super();
        this.quantifier = quantifier; //Token
        this.variable = variable; //Token
        this.right = right;
        this.line = quantifier.line;
    }
    toString(){
        return this.quantifier + this.variable + this.right;
    }
}
class FormulaAnd extends Formula {
    constructor(terms, connectives ) {
        super();
        this.terms = terms; //Array Formula
        this.connectives = connectives; //Array Token
        this.line = terms[0].line;
    }
    isEqualTo(formula){
        if (formula instanceof FormulaAnd){
            if (this.term.length !== formula.terms.length)
                return false;

            for (const i in this.terms) {
                if (! this.terms[i].isEqualTo(formula.terms[i]))
                    return false;
            }
            return true;
        }
        return false;
    }
    toString(){
        return '( ' + this.terms.join(' ∧ ') + ' )';
    }
}
class FormulaOr extends Formula {
    constructor(terms, connectives ) {
        super();
        this.terms = terms; //Array Formula
        this.connectives = connectives; //Array Token
        this.line = terms[0].line;
    }
    toString(){
        return '( ' + this.terms.join(' ∨ ') + ' )';
    }
}

class Term extends Formula {
    constructor(name) {
        super();
        this.name = name; //Token
        this.line = name.line;
    }
    toString(){
        let str = '';
        if (this.name instanceof Token){
            str += this.name.lexeme;
        }
        if(this.args instanceof Array){
            str +='('+ this.args.join() + ')';
        }
        return str;
    }
}
class TermVariable extends Term {  
}
class TermConstant extends Term {
}
class TermFunction extends Term {
    constructor(name, args) {
        super(name);
        this.args = args; //Array Formula
        this.line = name.line;
    }
}

class Rule {
    validate(formula){
        console.error('validate rule not implemented')
        return false;
    }
}
class RuleAndElim extends Rule{
    constructor(source){
        super();
        this.source = source;
    }
    validate(formula) {
        if (!(this.source instanceof FormulaAnd)) {
            console.error('Expected formula of type FormulaAnd as source');
            return false;
        }
        if(this.source.line > formula.line) {
            console.error('Source formula must occur before current formula')
            return false;
        }
        for (const term of this.source.terms){
            //FIXME check for smaller line no and scope
            console.log(String(formula),String(term))
            if (String(formula) === String(term))
                return true;
        }
        return false;
    }
}
class RuleAndIntro extends Rule{
    constructor(...sources){
        super();
        this.sources = sources;
    }
    validate(formula) {
        this.sources.forEach(sourceForm => {
            if (!(sourceForm instanceof Formula)) {
                console.error('Expected a formula as source');
                return false;
            }
        });
        if (!(formula instanceof FormulaAnd)) {
            console.error('Expected formula to validate to be of type FormulaAnd');
            return false;
        }

        let found = false;
        for (const term of formula.terms){
            //FIXME check for smaller line no and scope
            for (const sourceTerm of this.sources){
                if(sourceTerm.line > term.line){
                    console.error('Source formula must occur before current formula')
                    return false;
                }
                //console.log(String(term),String(sourceTerm))
                if (String(term) === String(sourceTerm)){
                    found = true;
                    break;
                }
            }
            if (!found){
                console.error(`Did not find ${term} in any source formula`);
                return false;
            }
        }
        
        return true;
    }
}

class RuleNegationElim extends Rule{
    constructor(source){
        super();
        this.source = source;
    }
    validate(formula) {
        if (!(this.source instanceof FormulaNot)) {
            console.error('Expected formula of type FormulaNot as source');
            return false;
        }
        if(this.source.line > formula.line) {
            console.error('Source formula must occur before current formula')
            return false;
        }
        if (!(this.source.right instanceof FormulaNot)) {
            console.error('Expected source formula of being double-negation');
            return false;
        }
        //FIXME check for smaller line no and scope
        console.log(String(formula),String(this.source.right.right))
        if (String(formula) === String(this.source.right.right))
            return true;
        
        return false;
    }
}

class RuleOrIntro extends Rule{
    constructor(source){
        super();
        this.source = source;
    }
    validate(formula) {
        if (!(this.source instanceof Formula)) {
            console.error('source must be a formula');
            return false;
        }
        if (!(formula instanceof FormulaOr)) {
            console.error('Expected formula of type FormulaOr');
            return false;
        }
        if(this.source.line > formula.line) {
            console.error('Source formula must occur before current formula')
            return false;
        }
        for (const term of formula.terms){
            console.log(String(term),String(this.source))
            if (String(term) === String(this.source))
                return true;
        }
        return false;
    }
}

class RuleBottomElim extends Rule{
    constructor(source){
        super();
        this.source = source;
    }
    validate(formula) {
        if (!(this.source instanceof Term)) {
            console.error('source must be a term');
            return false;
        }
        if (!(formula instanceof Formula)) {
            console.error('Expected a formula');
            return false;
        }
        if(this.source.line > formula.line) {
            console.error('Source formula must occur before current formula')
            return false;
        }
        if (this.source.name.type === TokenType.FALSE){
            return true;
        }
        return false;
    }
}

class RuleBottomIntro extends Rule{
    constructor(...sources){
        super();
        this.sources = sources;
    }
    validate(formula) {
        if (!(this.sources instanceof Array) || this.sources.length != 2) {
            console.error('Exactly two premises are needed as source');
            return false;
        }
        this.sources.forEach(sourceForm => {
            if (!(sourceForm instanceof Formula)) {
                console.error('Expected a formula as source');
                return false;
            }
        });

        if (!(formula instanceof Term)) {
            console.error('Expected formula to validate to be of type Term');
            return false;
        }
        if (formula.name.type !== TokenType.FALSE){
            console.error('Expected formula to validate to be of type TermConstant Bottom/False');
            return false;
        }

        //FIXME check for smaller line no and scope
        let sourceTerm1 = this.sources[0];
        let sourceTerm2 = this.sources[1];
        if(sourceTerm1.line > formula.line || sourceTerm2.line > formula.line ){
            console.error('Source formula must occur before current formula')
            return false;
        }
        let notsTerm1 = 0;
        let notsTerm2 = 0;
        while (sourceTerm1 instanceof FormulaNot) {
            sourceTerm1 = sourceTerm1.right;
            notsTerm1++;
        }
        while (sourceTerm2 instanceof FormulaNot) {
            sourceTerm2 = sourceTerm2.right;
            notsTerm2++;
        }
        if (String(sourceTerm1) === String(sourceTerm2) && notsTerm1 !== notsTerm2 ) {
            return true;
        }

        return false;
    }
}

let gLineNo = 0;
function parseLine(text){
    return new Parser(new Scanner(text,++gLineNo).scanTokens()).parse();
}

function justifyLine(line,rule){
    line.setRule(rule);
    const result = line.checkRule();
    if (result === true){
        line.isValid = true;
    }
    return result;
}

const l1 = '∀x ∀t (Zuhause(x, t) → ¬AmTatort(x, t))'
const l2 = '(Tet(a) ∧ Tet(b) ∧ Tet(c) ∧ (Small(a) ∨ Small(b) ∨ Small(c)))'
const l3 = 'Tet(a) ∧ Tet(b) ∧ Tet(c) ∧ (Small(a) ∨ Small(b) ∨ Small(c))'
const l4 = 'Tet(a) ∧ (Tet(b) ∧ Tet(c))'
const l5 = '∀x∀y(P(f(x)) → ¬(P(x) → Q(f(y),x,z)))'
const l6 = ' Tet    (c) '
const l7 = ' Tet(peter) '
const l8 = ' Tet(peter) ∧ Tet(c) '
const l9 = '¬¬Peter'
const l10 = ' Peter'
const l11 = 'Hans ∨ Peter ∨ Otto'
const l12 = 'Hans ∨ (Tet(peter) ∧ Tet(c)) ∨ Otto'
const l13 = '⊥'
const l14 = 'Lulu(a,b,c)'
const l15 = '¬Peter'
const l16 = '⊥'
//const tokens = new Scanner(l5,3).scanTokens()
//console.log(tokens)
//console.log(1 + tokens[0])
const line1 = parseLine(l1)
const line2 = parseLine(l2)
const line3 = parseLine(l3)
const line4 = parseLine(l4)
const line5 = parseLine(l5)
const line6 = parseLine(l6)
const line7 = parseLine(l7)
const line8 = parseLine(l8)
const line9 = parseLine(l9)
const line10 = parseLine(l10)
const line11 = parseLine(l11)
const line12 = parseLine(l12)
const line13 = parseLine(l13)
const line14 = parseLine(l14)
const line15 = parseLine(l15)
const line16 = parseLine(l16)

console.log( justifyLine(line6, new RuleAndElim(line3) ))
console.log( justifyLine(line6, new RuleAndElim(line2) ))
console.log( justifyLine(line6, new RuleAndElim(line4) ))
//console.log( line5)
console.log( String(line5))
console.log( justifyLine(line8, new RuleAndIntro(line6,line7) ))

console.log(line8.isValid)

console.log( justifyLine(line10, new RuleNegationElim(line9)))
console.log( justifyLine(line11, new RuleOrIntro(line10)))
console.log( justifyLine(line12, new RuleOrIntro(line8)))
console.log( justifyLine(line14, new RuleBottomElim(line13)))
console.log( justifyLine(line16, new RuleBottomIntro(line15,line10)))
console.log( justifyLine(line16, new RuleBottomIntro(line15,line9)))
//const line3  = new Parser(new Scanner(l3,3).scanTokens()).parse();
//const andElim = new AndElim(1,2)
//form.addRule(andElim)
//console.log(line3)

//const $ = document.querySelector.bind(document);
//const $$ = document.querySelectorAll.bind(document);
//let sy = '∀Hello or ⊥ and bye() → 12.6'
//console.log( new Scanner(sy,1).scanTokens())
//console.log(String(new Token(TokenType.LESS_EQUAL,'<=')) + 'test')
//console.log(new Token(TokenType.LESS_EQUAL,'<=').lexeme)

//new Scanner('').keywords.forEach((k,v)=>console.log(k,v))
