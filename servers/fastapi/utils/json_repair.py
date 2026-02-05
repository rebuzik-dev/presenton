
def repair_json_string(json_str: str) -> str:
    """
    Attempts to repair a truncated JSON string by closing open quotes, braces, and brackets.
    """
    if not json_str:
        return "{}"

    # Trim whitespace
    json_str = json_str.strip()

    # 1. Close open string
    # Count unescaped quotes to see if we are inside a string
    # specific heuristic: walk the string
    in_string = False
    escape = False
    for char in json_str:
        if char == '"' and not escape:
            in_string = not in_string
        
        if char == '\\' and not escape:
            escape = True
        else:
            escape = False
    
    if in_string:
        json_str += '"'

    # 2. Balance braces and brackets
    stack = []
    # We only care about ensuring that for every open structure, we close it at the end
    # But we need to be careful not to count braces inside strings (which we shouldn't since we just process the string end)
    # Re-scan to build stack of opens
    
    in_string = False
    escape = False
    for char in json_str:
        if char == '"' and not escape:
            in_string = not in_string
        
        if char == '\\' and not escape:
            escape = True
        else:
            escape = False
        
        if not in_string:
            if char == '{':
                stack.append('}')
            elif char == '[':
                stack.append(']')
            elif char == '}' or char == ']':
                if stack:
                    # If it matches top of stack, pop. If not, ignore (malformed input or dirtyjson handles it)
                    if stack[-1] == char:
                        stack.pop()

    # Append missing closures in reverse order
    while stack:
        json_str += stack.pop()
        
    return json_str
