# Folder structure

One of the big reasons for writing Tidy is to have a photo manager that doesn't lock you into a proprietary system (hello Photos.app), or even lock you into laying out your photos on disk in a certain way. I have tried to make the system be as flexible as possible, and this is what I've come up with so far. I'm open to ideas for improvements, so open an issue if you have any better ideas!

There are three main folders in the Tidy library:

* `Originals`
* `Thumbnails`
* `Edited`

## Originals

The `Originals` folder contains the original full resolution photos, these won't be modified in any way, other than setting the file creation timestamp to match when Tidy decides the photo was taken.

Under this folder you can lay out photos however you like, but I recommend you use a structure like `<year>/<month>` as it'll mean your photos are already organised if you ever want to move to another tool. However Tidy doesn't care how you lay out photos (the Photos.app importer I wrote uses the moment/event name instead of the month), so feel free to lay them out as you wish. If you have multiple cameras or multiple people taking photos, you might want to prefix the folders with that, e.g.:

`Originals/Nikon_D750/2016/January_2016`

`Originals/Mum/2016/January_2016`

When an existing photo library is imported, Tidy uses the last folder name (e.g. `January_2016`) as the album name.

You can nest albums under one another other, but I recommend each folder only contain albums or photos - not both.

## Thumbnails

The `Thumbnails` folder contains low resolution photos which are used internally by Tidy for displaying previews in the app. These will be shared amongst all devices even if the original isn't available. The folder structure of these mirrors that of the original file, so if the original is in:

`Originals/2016/January_2016/IMG_1499.jpg`

The thumbnail will be in:

`Thumbnails/2016/January_2016/IMG_1499.jpg`

The only difference is thumbnails are always JPEGs even if the original isn't, so will always have `.jpg` as the extension (when implemented, movie 'thumbnails' will be a low quality video rather than a static picture, so will have a different extension).

## Edited

The `Edited` folder contains edited versions of pictures. This is intended for minor edits, e.g. tweaking the contract/saturation, cropping, etc. This is still a WIP, but I expect it to follow the same structure as thumbnails.

If the original is in:

`Originals/2016/January_2016/IMG_1499.jpg`

Then the edit will be in:

`Edited/2016/January_2016/IMG_1499.jpg`

TBC:

* How to handle multiple edits
* Edits that are really different photos (i.e. the original and a highly edited version that are completely different)

## Dynamic folders

Once photos are imported into Tidy, any changes you make to the structure will only be reflected internally - no changes will be made to the structure on disk. So if you add or delete a photo to/from an album, it will be only saved in Tidy's internal database, but on disk the original structure will still be kept. This presents a problem, as it is effectively a form of lock in.

One solution would be to expose albums and other categories/tags on the filesystem. This could easily be done with a structure like this, where the folder just contains symlinks to the photos:

`Albums/Hong_Kong_2015`

`Places/Beaches`

`Years/2015`

`Animals/Dogs`

These would then be easy to expose via a SMB or WebDAV share, so your photos could be viewed on a TV or media player.