export type ValueType = number | boolean | string | Date | Object;

export interface Context {
  getVariable(name: string): ValueType;
}

export class ShadowContext implements Context {
  constructor(
    public upstream: Context = null,
    public shadows: { [name: string]: ValueType } = {}
  ) {}
  public getVariable(name: string): ValueType {
    if (this.shadows.hasOwnProperty(name)) {
      return this.shadows[name];
    }
    return this.upstream.getVariable(name);
  }
}

export class SimpleContext implements Context {
  public variables: { [name: string]: ValueType } = {};

  public getVariable(name: string): ValueType {
    return this.variables[name];
  }
}

import { intrinsics, operators, precedences } from "./intrinsics";
import { format } from "d3-format";
import { parse } from "./parser";

export abstract class Expression {
  public abstract getValue(context: Context): ValueType;
  public abstract toString(): string;
  public abstract getPrecedence(): number;

  public toStringPrecedence(parent: number) {
    if (this.getPrecedence() < parent) {
      return `(${this.toString()})`;
    } else {
      return this.toString();
    }
  }

  public getNumberValue(c: Context) {
    const v = this.getValue(c);
    return v as number;
  }

  public getStringValue(c: Context) {
    const v = this.getValue(c);
    return v.toString();
  }

  public static Parse(expr: string): Expression {
    return parse(expr) as Expression;
  }
}

export interface TextExpressionPart {
  string?: string;
  expression?: Expression;
  format?: string;
}

/** Text expression is a special class, it cannot be used inside other expression */
export class TextExpression {
  public parts: TextExpressionPart[];

  constructor(parts: TextExpressionPart[] = []) {
    this.parts = parts;
  }

  public getValue(context: Context): string {
    return this.parts
      .map(part => {
        if (part.string) {
          return part.string;
        } else if (part.expression) {
          const val = part.expression.getValue(context);
          if (part.format) {
            return format(part.format)(+val);
          } else {
            return val;
          }
        }
      })
      .join("");
  }

  public toString(): string {
    return this.parts
      .map(part => {
        if (part.string) {
          return part.string;
        } else if (part.expression) {
          const str = part.expression.toString();
          if (part.format) {
            return "${" + str + "}{" + part.format + "}";
          } else {
            return "${" + str + "}";
          }
        }
      })
      .join("");
  }

  public static Parse(expr: string): TextExpression {
    return parse(expr, { startRule: "start_text" }) as TextExpression;
  }
}

export class Value<T> extends Expression {
  constructor(public value: T) {
    super();
  }

  public getValue() {
    return this.value;
  }

  public toString() {
    return JSON.stringify(this.value);
  }

  public getPrecedence(): number {
    return precedences.VALUE;
  }
}

export class StringValue extends Value<string> {}
export class NumberValue extends Value<number> {}
export class BooleanValue extends Value<Boolean> {}
export class DateValue extends Value<Date> {}

export class FieldAccess extends Expression {
  constructor(public expr: Expression, public fields: string[]) {
    super();
  }

  public getValue(c: Context) {
    let v = this.expr.getValue(c) as any;
    for (const f of this.fields) {
      v = v[f];
    }
    return v;
  }

  public toString() {
    return `${this.expr.toStringPrecedence(
      precedences.FIELD_ACCESS
    )}.${this.fields.map(Variable.VariableNameToString).join(".")}`;
  }

  public getPrecedence(): number {
    return precedences.FIELD_ACCESS;
  }
}

export class FunctionCall extends Expression {
  public callable: Expression;
  public args: Expression[];

  constructor(callable: Expression, args: Expression[]) {
    super();
    this.callable = callable;
    this.args = args;
  }

  public getValue(c: Context) {
    const callable = this.callable.getValue(c) as Function;
    return callable(...this.args.map(arg => arg.getValue(c)));
  }

  public toString() {
    return `${this.callable.toStringPrecedence(
      precedences.VALUE
    )}(${this.args
      .map(arg => arg.toStringPrecedence(precedences.FUNCTION_ARGUMENT))
      .join(", ")})`;
  }

  public getPrecedence(): number {
    return precedences.FUNCTION_CALL;
  }
}

export class Operator extends Expression {
  private op: Function;
  constructor(
    public name: string,
    public lhs: Expression,
    public rhs?: Expression
  ) {
    super();
    if (rhs != undefined) {
      this.op = operators[name];
    } else {
      this.op = operators["unary:" + name];
    }
  }

  public getValue(c: Context) {
    const lhs = this.lhs.getValue(c);
    if (this.rhs != undefined) {
      const rhs = this.rhs.getValue(c);
      return this.op(lhs, rhs);
    } else {
      return this.op(lhs);
    }
  }

  public toString() {
    const p = this.getMyPrecedence();
    if (this.rhs != undefined) {
      return `${this.lhs.toStringPrecedence(p[1])} ${
        this.name
      } ${this.rhs.toStringPrecedence(p[2])}`;
    } else {
      return `${this.name} ${this.lhs.toStringPrecedence(p[1])}`;
    }
  }

  private getMyPrecedence(): number[] {
    if (this.rhs != undefined) {
      return precedences.OPERATORS[this.name];
    } else {
      return precedences.OPERATORS["unary:" + this.name];
    }
  }
  public getPrecedence(): number {
    return this.getMyPrecedence()[0];
  }
}

export class LambdaFunction extends Expression {
  public expr: Expression;
  public argNames: string[];
  public constructor(expr: Expression, argNames: string[]) {
    super();
    this.expr = expr;
    this.argNames = argNames;
  }
  public getValue(c: Context) {
    return (...args: ValueType[]) => {
      const lambdaContext = new ShadowContext(c);
      for (let i = 0; i < this.argNames.length; i++) {
        lambdaContext.shadows[this.argNames[i]] = args[i];
      }
      return this.expr.getValue(lambdaContext);
    };
  }

  public toString() {
    return `(${this.argNames.join(", ")}) => ${this.expr.toStringPrecedence(
      precedences.LAMBDA_EXPRESSION
    )}`;
  }

  public getPrecedence(): number {
    return precedences.LAMBDA_FUNCTION;
  }
}

export class Variable extends Expression {
  constructor(public name: string) {
    super();
  }
  public getValue(c: Context) {
    const v = c.getVariable(this.name);
    if (v === undefined) {
      return intrinsics[this.name];
    } else {
      return v;
    }
  }
  public toString() {
    return Variable.VariableNameToString(this.name);
  }
  public getPrecedence(): number {
    return precedences.VARIABLE;
  }

  public static VariableNameToString(name: string) {
    if (name.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
      return name;
    } else {
      return JSON.stringify(name).replace(/^\"|\"$/g, "`");
    }
  }
}
