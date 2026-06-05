# Dice Notation Reference

> For the full dice-notation spec (modifiers, operators, etc.), see
> [dice-roller.github.io documentation](https://dice-roller.github.io/documentation/guide/notation/modifiers.html).
> This page documents what's supported and any deviations.

---

## Basic Notation

| Example     | Meaning                 |
| ----------- | ----------------------- |
| `d20`       | Roll 1 twenty-sided die |
| `2d6`       | Roll 2 six-sided dice   |
| `3d10+4`    | Roll 3d10, add 4        |
| `2d8+1d6+3` | Mixed dice + modifier   |

Format: `[count]d<sides>[modifiers]`

When `count` is omitted, it defaults to `1`.

---

## Dice Types

| Notation | Die                      | Supported in 3D                                 |
| -------- | ------------------------ | ----------------------------------------------- |
| `d2`     | Coin / 2-sided           | Yes                                             |
| `d4`     | Tetrahedron              | Yes                                             |
| `d6`     | Cube                     | Yes                                             |
| `d8`     | Octahedron               | Yes                                             |
| `d10`    | Pentagonal trapezohedron | Yes                                             |
| `d12`    | Dodecahedron             | Yes                                             |
| `d20`    | Icosahedron              | Yes                                             |
| `d100`   | Percentile (two d10s)    | Yes                                             |
| `dF`     | Fudge / Fate die         | Yes (rendered as D6 with `-`, `0`, `+` symbols) |

`d100` is rendered physically as two d10s (tens + ones). Value `00+0` = `100`.

Custom-faced dice (e.g. `d[1,3,5]`) fall back to 2D when no 3D geometry matches.

---

## Modifiers

Most modifiers follow the [standard dice-roller notation](https://dice-roller.github.io/documentation/guide/notation/modifiers.html).

### Keep / Drop

| Modifier | Meaning        |
| -------- | -------------- |
| `khN`    | Keep highest N |
| `klN`    | Keep lowest N  |
| `dhN`    | Drop highest N |
| `dlN`    | Drop lowest N  |

When N is omitted, defaults to `1`. Bare `d<digits>` after a DICE token is
interpreted as `dl<digits>`.

### Explosion

| Modifier | Meaning                                 |
| -------- | --------------------------------------- |
| `!`      | Explode on max value (or compare point) |
| `!!`     | Compounding explosion                   |
| `!p`     | Penetrating explosion (new roll - 1)    |
| `!!p`    | Compounding + penetrating               |

All explosion types accept an optional compare point: `!>6`, `!!=10`, `!p<3`.

Capped at 1000 explosions per die.

### Reroll

| Modifier | Meaning                          |
| -------- | -------------------------------- |
| `r`      | Reroll indefinitely on condition |
| `ro`     | Reroll once only                 |

A bare number after `r`/`ro` sets the compare point to `<=N`.
Full compare point syntax also supported: `r>10`, `ro=1`.

### Unique

| Modifier | Meaning                                       |
| -------- | --------------------------------------------- |
| `u`      | Reroll duplicates until all values are unique |
| `uo`     | Reroll duplicates once only                   |

Optional compare point: `u>5`, `uo<3`.

### Min / Max

| Modifier | Meaning           |
| -------- | ----------------- |
| `minN`   | Floor values at N |
| `maxN`   | Cap values at N   |

### Sort

| Modifier | Meaning         |
| -------- | --------------- |
| `s`      | Sort ascending  |
| `sa`     | Sort ascending  |
| `sd`     | Sort descending |

### Forced / Predetermined Rolls

Force specific outcomes using `@` notation:

| Example           | Meaning                           |
| ----------------- | --------------------------------- |
| `6d6@4,4,4,4,4,4` | All six dice show 4               |
| `2d20@20,1`       | First shows 20, second shows 1    |
| `4d6@3,3,3,3kh3`  | Forced values with keep modifiers |

When `@` is used in 3D mode, dice still animate physically but the forced values
are ignored — a warning is shown, and normal random physics proceeds.

Mismatched value count throws an error.

### Criticals & Failures

| Modifier | Meaning                                       |
| -------- | --------------------------------------------- |
| `cs`     | Critical success on max value                 |
| `cs=N`   | Critical success on specific value            |
| `cf`     | Critical failure on min value                 |
| `cf=N`   | Critical failure on specific value            |
| `csb`    | Critical success botch (+1 to total per crit) |
| `csb=N`  | Critical success botch on specific value      |
| `cfb`    | Critical failure botch (-1 to total per crit) |
| `cfb=N`  | Critical failure botch on specific value      |
| `f>N`    | Target failure condition (WoD-style)          |

Botch modifiers (`csb`/`cfb`) add or subtract from the result sum:

| Example      | Explanation                         |
| ------------ | ----------------------------------- |
| `1d10csb>=6` | Roll 10 → 1 success + 1 botch = 2   |
| `1d10>=6cfb` | Roll 1 → 0 successes − 1 botch = -1 |
| `3d6csb`     | Roll 6,3,6 → sum 15 + 2 botch = 17  |

**How it works internally:** `csb` adds +1 to the result sum for each die that
scores a critical success. `cfb` subtracts -1 for each critical failure. Both
work with or without a target success threshold. Botch flags are propagated to
individual `DiceRoll` objects for full result transparency.

### Target Success (bare compare)

A bare compare point at the end of a dice group sets success counting mode:

| Example    | Meaning                                    |
| ---------- | ------------------------------------------ |
| `10d10>=6` | Each die >=6 is a success; sum = successes |
| `d20>15`   | Count successes above 15                   |

In success-counting mode, the result is `successes - failures`.

### Chaining

Multiple modifiers can be chained: `4d6r1kh3` — reroll 1s, keep highest 3.

---

## Arithmetic Operators

| Operator | Meaning        | Precedence  |
| -------- | -------------- | ----------- |
| `^`      | Exponentiation | 4 (highest) |
| `*`      | Multiply       | 3           |
| `/`      | Divide (floor) | 3           |
| `%`      | Modulo         | 3           |
| `+`      | Add            | 2           |
| `-`      | Subtract       | 2           |

Parentheses `()` override precedence: `(2d6+3)*2`.

---

## Custom Face Values

Use square brackets to define custom faces:

| Example       | Meaning                           |
| ------------- | --------------------------------- |
| `d[1,3,5]`    | Roll one of 1, 3, or 5            |
| `3d[2,4,6,8]` | Roll 3 dice from [2,4,6,8]        |
| `d[1-6,8,10]` | Range expansion: 1,2,3,4,5,6,8,10 |

Ranges (`start-end`) are expanded at parse time. Custom-faced dice fall back
to 2D when the sides don't match a 3D-supported geometry.

---

## Fudge / Fate Dice (`dF`)

`dF` rolls a fudge die returning one of `-1`, `0`, or `+1`.
The 3D renderer displays `-`, ` ` (blank), `+` symbols on the D6 cube faces.

- `4dF` — roll 4 fudge dice
- Sum can be negative
- Modifiers work on fudge dice (keep/drop/sort/etc.)

---

## Advanced Expressions

Full arithmetic with parentheses:

| Expression      | Meaning                         |
| --------------- | ------------------------------- |
| `(2d6+3)*2`     | Roll 2d6+3, then double         |
| `4d20kh3 + 2d6` | Keep highest 3 of 4d20, add 2d6 |
| `2d10^2`        | Roll 2d10, square the total     |

---

## Quiet Mode

Append `quiet=true` to a `/roll` command to suppress chat output:

```
/roll 2d6 quiet=true
```

The result is still returned as the command value (usable in macros).
