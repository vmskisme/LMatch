import { LSyntaxError } from "./error";

interface Syntax {
    rawSyntax: string,
    start: number,
    end: number,
    curScan: number,
}

enum Types {
    Array,
    object,
    number,
    string,
    undefined,
    null,
    boolean,
    rest,
    identifier, // unsupported
}


interface AST {
    value: any, // Array object literal undefined boolean null
    type: Types, // Array object number string undefined null boolean rest
    rest: boolean, // '...' only valid for array and object,true means that the pattern only needs to match the part before '...'
    start: number,
    end: number,
}

interface KeyValuePair {
    key: AST,
    value: AST,
}


function parserObject(syntax: Syntax): AST {
    const rawSyntax = syntax.rawSyntax;
    let skipI = rawSyntax.slice(syntax.curScan).search(/\S/);
    if (skipI == -1) {
        throw new LSyntaxError({
            rawSyntax: rawSyntax,
            start: syntax.start,
            end: syntax.end,
            errorStart: syntax.curScan,
            errorEnd: syntax.curScan + skipI,
            message: "expected an object syntax, given empty field",
            help: "",
        })
    }
    let start = skipI + syntax.curScan;
    if (rawSyntax[start] != "{") {
        throw new LSyntaxError({
            rawSyntax: rawSyntax,
            start: syntax.start,
            end: syntax.end,
            errorStart: start,
            errorEnd: start + 1,
            message: "expected an object syntax, but it start with " + rawSyntax[start],
            help: "",
        });
    }
    let obj: Array<KeyValuePair> = [];
    let keys: Array<AST> = [];
    let rest = false;
    const [KEY, COLON, VALUE, COMMA, END] = [0, 1, 2, 3, 4];
    let state = KEY;
    let nextI = 0;
    syntax.curScan = start + 1;
    while (true) {
        if (state == END) {
            break;
        }
        switch (state) {
            case KEY:
                let keyAST = parserKey(syntax);
                if (rawSyntax[syntax.curScan] == "}") {
                    state = END;
                    break;
                } else if (keyAST.type == Types.rest) {
                    rest = true;
                    state = COMMA;
                    break;
                }
                keys.push(keyAST);
                state = COLON;
                break;
            case COLON:
                nextI = rawSyntax.slice(syntax.curScan).search(/\S/);
                if (nextI == -1 || rawSyntax[syntax.curScan + nextI] != ":") {
                    throw new LSyntaxError({
                        rawSyntax: rawSyntax,
                        start: syntax.start,
                        end: syntax.end,
                        errorStart: syntax.curScan,
                        errorEnd: syntax.curScan + nextI,
                        message: "object expected ':' after a key, given" + rawSyntax[syntax.curScan + (nextI == -1 ? 0 : nextI)],
                        help: "",
                    });
                }
                state = VALUE;
                syntax.curScan += nextI + 1;
                break;
            case VALUE:
                let valAST = parserValue(syntax, /[,\}]/);
                obj.push({
                    key: keys[keys.length - 1],
                    value: valAST,
                })
                obj[obj.length - 1].value = valAST;
                state = COMMA;
                break;
            case COMMA:
                nextI = rawSyntax.slice(syntax.curScan).search(/\S/);
                syntax.curScan += nextI;
                if (nextI == -1 || syntax.curScan >= syntax.end || !(rawSyntax[syntax.curScan] in [',', '}'])) {
                    throw new LSyntaxError({
                        rawSyntax: rawSyntax,
                        start: syntax.start,
                        end: syntax.end,
                        errorStart: syntax.curScan,
                        errorEnd: syntax.curScan + nextI,
                        message: "object value must be end with ',' or '}'",
                        help: "",
                    });
                }
                if (rawSyntax[syntax.curScan] == "}") {
                    state = END;
                } else {
                    if (rest) {
                        throw new LSyntaxError({
                            rawSyntax: rawSyntax,
                            start: syntax.start,
                            end: syntax.end,
                            errorStart: syntax.curScan - 3 - nextI,
                            errorEnd: syntax.curScan + 1,
                            message: "Rest element must be last element",
                            help: "",
                        });
                    }
                    state = KEY;
                }
                syntax.curScan++;
                break;
            default:
                break;
        }
    }
    return {
        value: obj,
        type: Types.object,
        rest: rest,
        start: start,
        end: syntax.curScan,
    };
}


function parserKey(syntax: Syntax): AST {
    const rawSyntax = syntax.rawSyntax;
    let skipI = rawSyntax.slice(syntax.curScan).search(/\S/);
    let start = syntax.curScan + skipI;
    if (skipI == -1) {
        throw new LSyntaxError({
            rawSyntax: rawSyntax,
            start: syntax.start,
            end: syntax.end,
            errorStart: syntax.curScan,
            errorEnd: syntax.curScan + 1,
            message: "expected an object key, given empty field",
            help: "",
        });
    }
    if (rawSyntax[start] == "'" || rawSyntax[start] == '"') {
        syntax.curScan = start;
        return parserString(syntax);
    }
    if (rawSyntax[start] == ".") {
        if (rawSyntax.slice(start, start + 3) == "...") {
            return {
                value: "...",
                type: Types.rest,
                rest: false,
                start: start,
                end: start + 3,
            }
        }
    }
    let endI = rawSyntax.slice(start).search(/[\s\:\}]/);
    if (endI == -1) {
        throw new LSyntaxError({
            rawSyntax: rawSyntax,
            start: syntax.start,
            end: syntax.end,
            errorStart: start,
            errorEnd: start + rawSyntax.slice(start).search(/[^\s\:\}]/),
            message: "object key must be end with ':'",
            help: "",
        });
    }
    syntax.curScan = start + endI;
    return {
        value: rawSyntax.slice(start, start + endI),
        type: Types.string,
        rest: false,
        start: start,
        end: start + endI,
    }
}


function parserValue(syntax: Syntax, pause: string | undefined | null | RegExp = undefined): AST {
    const rawSyntax = syntax.rawSyntax;
    let skipI = rawSyntax.slice(syntax.curScan).search(/\S/);
    let start = syntax.curScan + skipI;
    if (skipI == -1) {
        throw new LSyntaxError({
            rawSyntax: rawSyntax,
            start: syntax.start,
            end: syntax.end,
            errorStart: syntax.curScan,
            errorEnd: syntax.curScan + 1,
            message: "expected an valid literal, given empty field",
            help: "",
        });
    }
    if (!pause) {
        pause = /\s/;
    }
    if (rawSyntax.slice(start).search(pause) == 0) {
        syntax.curScan = start + 1;
        return {
            value: rawSyntax[start],
            type: Types.string,
            rest: false,
            start: start,
            end: start + 1,
        };
    }

    if (rawSyntax[start] == '"' || rawSyntax[start] == "'") {
        return parserString(syntax);
    }

    if (rawSyntax[start] == "[") {
        return parserArray(syntax);
    }

    if (rawSyntax[start] == "{") {
        return parserObject(syntax);
    }
    if (rawSyntax[start] == ".") {
        if (rawSyntax.slice(start, 3 + start) == "...") {
            return {
                value: "...",
                type: Types.rest,
                rest: false,
                start: start,
                end: start + 3,
            }
        }
    }
    return parserBaseTypeLiteral(syntax, pause);
}



function parserBaseTypeLiteral(syntax: Syntax, pause: string | undefined | null | RegExp = undefined): AST {
    const rawSyntax = syntax.rawSyntax;
    let skipI = rawSyntax.slice(syntax.curScan).search(/\S/);
    if (skipI == -1) {
        throw new LSyntaxError({
            rawSyntax: rawSyntax,
            start: syntax.start,
            end: syntax.end,
            errorStart: syntax.curScan,
            errorEnd: syntax.curScan + 1,
            message: "expected an valid literal, given empty field",
            help: "",
        });
    }

    if (!pause) {
        pause = /\s/;
    }
    let start = skipI + syntax.curScan;
    let end = rawSyntax.slice(start).search(pause);
    if (end == -1) {
        end = syntax.end;
    }
    syntax.curScan = end + start;
    let result: AST = {
        value: undefined,
        type: Types.undefined,
        rest: false,
        start: start,
        end: end + start,
    }
    let literalStr = rawSyntax.slice(start, end + start);
    switch (literalStr) {
        case "false":
            result.value = false;
            result.type = Types.boolean;
            return result;
        case "true":
            result.value = true;
            result.type = Types.boolean;
            return result;
        case "null":
            result.value = null;
            result.type = Types.null;
            return result;
        case "undefined":
            result.value = undefined;
            result.type = Types.undefined;
            return result;
        case "":
            throw new LSyntaxError({
                rawSyntax: rawSyntax,
                start: syntax.start,
                end: syntax.end,
                errorStart: start,
                errorEnd: start + 1,
                message: "expected an valid literal, given empty field",
                help: "",
            });
    }
    let num = Number(literalStr);
    if (!isNaN(num)) {
        result.value = num;
        result.type = Types.number;
        return result;
    }
    throw new LSyntaxError({
        rawSyntax: rawSyntax,
        start: syntax.start,
        end: syntax.end,
        errorStart: start,
        errorEnd: end + start,
        message: "expected a valid literal",
        help: "",
    });
}


function parserString(syntax: Syntax): AST {
    const rawSyntax = syntax.rawSyntax;
    let skipI = rawSyntax.slice(syntax.curScan).search(/\S/);
    let start = skipI + syntax.curScan;

    if (skipI == -1) {
        throw new LSyntaxError({
            rawSyntax: rawSyntax,
            start: syntax.start,
            end: syntax.end,
            errorStart: syntax.curScan,
            errorEnd: syntax.curScan + 1,
            message: "expected an string, given empty field",
            help: "",
        });
    }

    if (rawSyntax[start] != "'" && rawSyntax[start] != '"') {
        throw new LSyntaxError({
            rawSyntax: rawSyntax,
            start: syntax.start,
            end: syntax.end,
            errorStart: syntax.curScan,
            errorEnd: syntax.curScan + 1,
            message: "string must be start with single or double quotes",
            help: "",
        });
    }
    let pause = rawSyntax[start];
    let end = rawSyntax.slice(start + 1).search(pause);
    if (end == -1) {
        throw new LSyntaxError({
            rawSyntax: rawSyntax,
            start: syntax.start,
            end: syntax.end,
            errorStart: syntax.curScan,
            errorEnd: syntax.end,
            message: "string must be end with " + rawSyntax[start] == "'" ? "single quote" : "double quotes",
            help: "",
        });
    }
    syntax.curScan = start + end + 2;
    return {
        value: rawSyntax.slice(start + 1, start + end + 1),
        type: Types.string,
        rest: false,
        start: start,
        end: start + end + 1,
    }
}


function parserArray(syntax: Syntax): AST {
    const rawSyntax = syntax.rawSyntax;
    let skipI = rawSyntax.slice(syntax.curScan).search(/\S/);
    if (skipI == -1) {
        throw new LSyntaxError({
            rawSyntax: rawSyntax,
            start: syntax.start,
            end: syntax.end,
            errorStart: syntax.curScan,
            errorEnd: syntax.curScan + skipI,
            message: "expected an Array syntax, given empty field",
            help: "",
        })
    }
    let start = skipI + syntax.curScan;
    if (rawSyntax[start] != "[") {
        throw new LSyntaxError({
            rawSyntax: rawSyntax,
            start: syntax.start,
            end: syntax.end,
            errorStart: start,
            errorEnd: start + 1,
            message: "expected an Array syntax, but it start with " + rawSyntax[start],
            help: "",
        });
    }
    let array: Array<AST> = [];
    let rest = false;
    const [ELEMENT, NEXT, END] = [0, 1, 2];
    let state = ELEMENT;
    syntax.curScan = start + 1;
    while (syntax.curScan < syntax.end) {
        if (state == END) {
            break;
        }
        switch (state) {
            case ELEMENT:
                let subAST = parserValue(syntax, /[\s\,\]]/);
                if (subAST.value == ",") {
                    throw new LSyntaxError({
                        rawSyntax: rawSyntax,
                        start: syntax.start,
                        end: syntax.end,
                        errorStart: array.length > 0 ? array[array.length - 1].end : start,
                        errorEnd: syntax.curScan,
                        message: "expected identifier",
                        help: "",
                    });
                } else if (subAST.value == "]") {
                    state = END;
                    break;
                } else if (subAST.type == Types.rest) {
                    state = NEXT;
                    rest = true;
                    break;
                }
                array.push(subAST);
                state = NEXT;
                break;
            case NEXT:
                let nextI = rawSyntax.slice(syntax.curScan).search(/\S/);
                syntax.curScan += nextI;
                if (nextI == -1 || !(rawSyntax[syntax.curScan] in [',', ']'])) {
                    throw new LSyntaxError({
                        rawSyntax: rawSyntax,
                        start: syntax.start,
                        end: syntax.end,
                        errorStart: syntax.curScan,
                        errorEnd: syntax.curScan + nextI,
                        message: "Array element must be end with ',' or ']'",
                        help: "",
                    });
                }
                if (rawSyntax[syntax.curScan] == "]") {
                    state = END;
                } else {
                    if (rest) {
                        throw new LSyntaxError({
                            rawSyntax: rawSyntax,
                            start: syntax.start,
                            end: syntax.end,
                            errorStart: syntax.curScan - 3 - nextI,
                            errorEnd: syntax.curScan + 1,
                            message: "Rest element must be last element",
                            help: "",
                        });
                    }
                    state = ELEMENT;
                }
                syntax.curScan++;
                break;
            default:
                break;
        }
    }
    return {
        value: array,
        type: Types.Array,
        rest: rest,
        start: start,
        end: syntax.curScan,
    };
}


function parserIdentifier(syntax: Syntax): AST {
    const rawSyntax = syntax.rawSyntax;
    let skipI = rawSyntax.slice(syntax.curScan).search(/\S/);
    if (skipI == -1) {
        throw new SyntaxError("identifier error");
    }
    let start = skipI;
    let head = rawSyntax[start];
    if (head.search(/[(a-z)(A-Z)\$\_]/) != 0) {
        throw new SyntaxError("identifier must start with a-z or A-Z or $ or _");
    }
    let reInvalidFiled = /[^(a-z)(A-Z)(0-9)\$\_]/;
    let end = rawSyntax.slice(start + 1).search(reInvalidFiled);
    let result: AST = {
        value: "",
        type: Types.identifier,
        rest: false,
        start: start,
        end: start,
    }
    if (end == -1) {
        result.value = rawSyntax.slice(start);
        result.end = syntax.end - 1;
    } else {
        result.value = rawSyntax.slice(start, end);
        result.end = end - 1;
    }
    return result;
}


export {
    parserArray,
    parserObject,
    parserBaseTypeLiteral,
    parserValue,
    AST,
    Syntax,
    KeyValuePair,
    Types,
}