#!/usr/bin/env python3

# @raycast.title Switch to Lowercase
# @raycast.input {"type": "text"}

import sys

selection = sys.stdin.read()
sys.stdout.write(selection.lower())
