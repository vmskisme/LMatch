# A toy level pattern matching for javascript
javascript only contains if-else and switch-case control flows, both of these control flows can lead to annoying nested structures when it comes to deconstruct a complex object and array. To solve this problem i developed a pattern matching, it was inspire by [rust pattern matching](https://doc.rust-lang.org/std/keyword.match.html).


## Examples

### Usage
compile
```ts
import {compile} from "src/match"

let pattern = compile("{x:1,y:2}");
console.log(pattern({x:2,y:2}) == true);
```
compile is a curry function, it accepts a string that represents a valid javascript literal, and only supported 'number','string', 'object', 'undefined', 'boolean', 'null'. 
the return function accepts a any type javascript expression, return a boolean indicating  whether the expression conforms to the pattern.


match
```ts
import {match} from "src/match"


let foo={x:1,y:2,z:[1,2,3]};

// function match(exp, obj)=>any
let result = match(foo,{
    "{x:1,y:3}":(a)=>{
        return a;
    },
    "{x:1,y:2,z:[1,2,3]}":(a)=>{
        return a; 
    },
    "":(a)=>{
        return a;
    }
});
console.log(result) // {x:1,y:2,z:[1,2,3]}
```
The first parameter of match is a expression(same as compile), the second parameter is an object that key is pattern and value is a function. when a pattern is matched, the call of corresponding function(parameter is expression above) is returned.

### Literal pattern
literal represents number, string, null, boolean and undefined

```ts
match(foo,{
    "undefined":()=>{
        console.log("match undefined");
    },
    "114":()=>{
        console.log("match number")
    },
    "null":()=>{
        console.log("match null")
    },
    "true":()=>{
        console.log("match boolean")
    },
    "'undefined'":()=>{ // is equivalent to '"undefined"'
        console.log("match string")
    }
});
```

### object pattern and Array pattern

```ts
match(foo,{
    "{x:1,y:2}":()=>{
        console.log("match object {x:1,y:2}");
    },
    "[1,2,3]":()=>{
        console.log("match Array [1,2,3]")
    },
    "{x:1,y:2,z:[1,2,undefined],w:null}":()=>{
        console.log("match object {x:1,y:2,z:[1,2,undefined],w:null}")
    },
    "[1,2,{x:'h',y:false}]":()=>{
        console.log("match Array [1,2,{x:'h',y:false}]")
    }
});
```

#### Rest ...
... can be the last item of Array and object, it means that the pattern only needs to match the part before ...
```ts
match({x:1,y:2,z:3,w:false},{
    "{x:1,y:2}":()=>{
        //
    },
    "{x:1,y:2,z:3,...}":()=>{
        // it will be matched
    },
});

match([1,2,3,true],{
    "[1,2]":()=>{
        //
    },
    "[1,2,3,...]":()=>{
        // it will be matched
    },
});
```
