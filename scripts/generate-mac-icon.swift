// Rebuild the original InkFlow app icon with macOS system drawing tools.
import AppKit

let output = CommandLine.arguments[1]
let size = 1024
let image = NSImage(size: NSSize(width: size, height: size))
image.lockFocus()
let tile = NSBezierPath(roundedRect: NSRect(x: 62, y: 62, width: 900, height: 900), xRadius: 205, yRadius: 205)
NSGradient(starting: NSColor(red: 0.16, green: 0.53, blue: 1, alpha: 1), ending: NSColor(red: 0.02, green: 0.22, blue: 0.72, alpha: 1))!.draw(in: tile, angle: -65)

// A white page with a folded corner and a flowing ink stroke.
let page = NSBezierPath()
page.move(to: NSPoint(x: 310, y: 235))
page.line(to: NSPoint(x: 310, y: 790))
page.line(to: NSPoint(x: 590, y: 790))
page.line(to: NSPoint(x: 740, y: 640))
page.line(to: NSPoint(x: 740, y: 235))
page.close()
NSColor.white.setFill()
page.fill()
let fold = NSBezierPath()
fold.move(to: NSPoint(x: 590, y: 790))
fold.line(to: NSPoint(x: 590, y: 640))
fold.line(to: NSPoint(x: 740, y: 640))
fold.close()
NSColor(red: 0.73, green: 0.84, blue: 1, alpha: 1).setFill()
fold.fill()
let ink = NSBezierPath()
ink.move(to: NSPoint(x: 390, y: 460))
ink.curve(to: NSPoint(x: 560, y: 475), controlPoint1: NSPoint(x: 565, y: 685), controlPoint2: NSPoint(x: 620, y: 565))
ink.curve(to: NSPoint(x: 445, y: 350), controlPoint1: NSPoint(x: 485, y: 350), controlPoint2: NSPoint(x: 365, y: 295))
ink.curve(to: NSPoint(x: 645, y: 385), controlPoint1: NSPoint(x: 500, y: 395), controlPoint2: NSPoint(x: 585, y: 320))
ink.lineWidth = 25
ink.lineCapStyle = .round
NSColor(red: 0.04, green: 0.35, blue: 0.85, alpha: 1).setStroke()
ink.stroke()
image.unlockFocus()
let bitmap = NSBitmapImageRep(data: image.tiffRepresentation!)!
try bitmap.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: output))
