"""List IL2CPP const-field default values (Constants.DAY_LENGTH etc.) from a global-metadata.dat.

Usage: python -I research/extract-constants.py path/to/global-metadata.dat [ClassName ...]

Only metadata v27 is handled (typeDefinition = 88 bytes, fieldStart at +32, field_count u16 at +68).
The metadata keeps the raw default bytes but not their C# type, so every value is printed as
int32 / float32 / float64 and the reader picks the plausible one from the field name.
"""
import struct
import sys

path, wanted = sys.argv[1], set(sys.argv[2:])
data = open(path, "rb").read()
u32 = lambda o: struct.unpack_from("<I", data, o)[0]
i32 = lambda o: struct.unpack_from("<i", data, o)[0]
assert u32(4) == 27, "only global-metadata v27 is supported"
table = lambda n: (u32(8 + 8 * n), u32(12 + 8 * n))  # (offset, size) pairs after the 8-byte header
strings, _ = table(2)
fields, _ = table(11)
defaults, defaults_size = table(7)
blob, _ = table(8)
types, types_size = table(19)

def text(index):
    start = strings + index
    return data[start:data.index(b"\0", start)].decode("utf8", "replace")

owner = {}
for t in range(types_size // 88):
    base = types + t * 88
    first, count = i32(base + 32), struct.unpack_from("<H", data, base + 68)[0]
    for k in range(count):
        owner[first + k] = text(u32(base))

for k in range(defaults_size // 12):
    field, _, offset = struct.unpack_from("<iii", data, defaults + k * 12)
    cls = owner.get(field, "?")
    if offset < 0 or (wanted and cls not in wanted):
        continue
    raw = data[blob + offset:blob + offset + 8]
    print(f"{cls}.{text(u32(fields + field * 12))}: int={struct.unpack_from('<i', raw)[0]} "
          f"float={struct.unpack_from('<f', raw)[0]:.4g} double={struct.unpack_from('<d', raw)[0]:.4g}")
