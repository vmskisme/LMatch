import { LSyntaxError } from "./error";
import { parserValue, AST, Syntax,Types } from "./parser";



function match(exp: any, patterns: object): any {
    for (const func of Object.values(patterns)) {
        if (typeof func != "function") {
            throw new TypeError("expected a Function");
        }
    }

    for (const [pattern, func] of Object.entries(patterns)) {
        if (compile(pattern)(exp)) {
            return func(exp);
        }
    }
}


function matchExp(ast: AST, exp: any): boolean {
    if (ast.type == Types.rest) {
        return true;
    }

    switch (typeof exp) {
        case "boolean":
            return ast.type == Types.boolean && exp == ast.value;
        case "undefined":
            return ast.type == Types.undefined;
        case "number":
            return ast.type == Types.number && exp == ast.value;
        case "string":
            return ast.type == Types.string && exp == ast.value;
        case "object":
            if (exp == null) {
                return ast.type == Types.null;
            }
            if(ast.type != Types.object && ast.type !=Types.Array){
                return false;
            }
            if (Array.isArray(exp)) {
                return matchArray(ast, exp);
            }
            return matchObject(ast, exp);
        default:
            throw new TypeError("type " + typeof exp + " is not supported");
    }
}

function matchArray(ast: AST, exp: Array<any>): boolean {
    let cmp = exp.length - ast.value.length;
    if (cmp < 0 || (cmp > 0 && !ast.rest)) {
        return false;
    }
    for (let i = 0; i < ast.value.length; i++) {
        if (!matchExp(ast.value[i], exp[i])) {
            return false;
        }
    }
    return true;
}

function matchObject(ast: AST, exp: Object): boolean {
    let cmp = Object.keys(exp).length - ast.value.length;
    if (cmp < 0 || (cmp > 0 && !ast.rest)) {
        return false;
    }
    for (const pair of ast.value) {
        const key: string = pair.key.value;
        const value = Object.getOwnPropertyDescriptor(exp, key);
        if (!value) {
            return false;
        }
        if (!matchExp(pair.value, value.value)) {
            return false;
        }
    }
    return true;
}


function skipSpace(s:string) :string{
	let first = s.search(/\S/);
	if (first == -1) return s;
	return s.slice(first);
}


function compile(rawSyntax: string): Function {
    rawSyntax = skipSpace(rawSyntax);
    if (rawSyntax.length == 0) { // empty pattern means any match
        return () => {
            return true;
        };
    }
    let syntax: Syntax = {
        rawSyntax: rawSyntax,
        start: 0,
        end: rawSyntax.length,
        curScan: 0,
    }

    let ast: AST = parserValue(syntax)
    
    let invalidChar = rawSyntax.slice(ast.end + 1).search(/\S/);
    if (invalidChar != -1) {
        throw new LSyntaxError({
            rawSyntax:rawSyntax,
            start:0,
            end:rawSyntax.length,
            errorStart:ast.end+1,
            errorEnd: rawSyntax.length,
            message: "unexpected token",
            help: "pattern only supported single expression",
        })
    }

    return (exp: any): boolean => {
        return matchExp(ast, exp);
    };
}


export {
    compile,
    match,
}