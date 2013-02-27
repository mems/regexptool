# Regular expression tool #

A webapp to test, match, exec and replace with regular expressions on strings

Inspired by the great tool of Grant Skinner: [RegExr](http://gskinner.com/RegExr/) (Flash online tool)

It's use JavaScript's regular expression (supported by the browser)

* [Regular Expression Syntax](http://msdn.microsoft.com/en-us/library/ie/1400241x%28v=vs.94%29.aspx), [Regular Expression Object](http://msdn.microsoft.com/en-us/library/ie/h6e2eb7w%28v=vs.94%29.aspx) and [RegExp Object](http://msdn.microsoft.com/en-us/library/ie/9dthzd08%28v=vs.94%29.aspx) at the MSDN
* [Regular Expressions Chapter](https://developer.mozilla.org/en-US/docs/JavaScript/Guide/Regular_Expressions) and [RegExp Object Referenc](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/RegExp) at the MDN
* [ECMA-262, ECMAScript Language Specification](http://www.ecma-international.org/publications/standards/Ecma-262.htm)
* http://docs.webplatform.org/wiki/concepts/programming/javascript/regex

## Future improvements ##

* [critical] implements save/restore selection in `#text`. See `_updateHighlights()` and http://stackoverflow.com/a/5596688/470117
* enhance user interface!
* implements in `#text` and `#output` a HTML renderer of RAW text (`\t\n\r`) (or using the `<pre>` wrapper trick). It's a [Firefox bug](https://bugzilla.mozilla.org/show_bug.cgi?id=116083)
* implements a RegExp parser like [RegExr](http://gskinner.com/RegExr/) + predefined and community patterns (use datalist?)
* check if `ReplacePatternSlicer` handle correctly escaped chars (specially unknowns or marlformed escaped chars like \10 \z \x2 etc.)
* replace `ReplacePatternSlicer` by `string.replacer(regexp, replacerFunction)`?
* add support of [XRegExp](http://xregexp.com/) as an option (native or XRegExp)
* add timers for grouping `input` and `change` multiple frame events
* add process timing to: detect a potential bug (there are infinites loops here) or a heavy task could required be in worker (larges texts or lot of matches)
