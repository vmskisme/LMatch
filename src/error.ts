

interface ErrorInfo {
    rawSyntax: string,
    start: number,
    end: number,
    errorStart: number,
    errorEnd: number,
    message: string,
    help: string,
}

function _genSyntaxErrorMessage(errorInfo: ErrorInfo): string {
    const rawSyntax = errorInfo.rawSyntax;
    let start = errorInfo.errorStart - rawSyntax.slice(errorInfo.start, errorInfo.errorStart).split("").reverse().join("").search(/\S/);
    let message = [];
    message.push("\n");
    if (errorInfo.help.length > 0) {
        message.push(rawSyntax.slice(errorInfo.start, errorInfo.errorStart));
        message.push('\n');
        for (let i = 0; i < start; i++) {
            message.push(" ");
        }
        message.push("^ help: " + errorInfo.help + "\n");
    }
    message.push(rawSyntax.slice(errorInfo.errorStart, errorInfo.errorEnd));
    message.push('\n');
    for (let i = errorInfo.start; i < Math.min(3, errorInfo.errorEnd - errorInfo.errorStart); i++) {
        message.push("-");
    }
    message.push(errorInfo.message);
    return message.join("");
}


class LSyntaxError extends SyntaxError {
    constructor(errorInfo: ErrorInfo) {
        super(_genSyntaxErrorMessage(errorInfo));
    }

}


export {
    LSyntaxError,
}