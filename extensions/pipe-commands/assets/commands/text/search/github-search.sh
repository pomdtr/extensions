#!/bin/bash

# @raycast.title Github Search
# @raycast.packageName Web Searches
# @raycast.input {"type": "text", "percentEncoded": true}

read -r query
open "https://github.com/search?q=$query"
