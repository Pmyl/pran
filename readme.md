# -- pran-phonemes --
## <a name="pran-phonemes-core"></a> CORE
| Language | Type | Dependencies |
| ------ | ------ | ------ |
| Rust/Python | Tools library | _None_ |
#### Functionality
Take text, generate phonemes. Not only text in input but if possible also time of the words so that the output can contain timings for phonemes as well.

## <a name="pran-phonemes-frontend"></a> FRONTEND
| Language | Type | Dependencies |
| ------ | ------ | ------ |
| HTML5 | Tools library | _None_ |
#### Functionality
Take phonemes, show mouth animation. Take configuration of images to map them to phonemes.
Probably take canvas context, position and show animation in canvas.

# -- pran-animation --
## <a name="pran-animation-frontend"></a> FRONTEND
| Language | Type | Dependencies |
| ------ | ------ | ------ |
| HTML5 | Tools library | [pran-phonemes#FRONTEND](#pran-phonemes-frontend) |
#### Functionality
Take configuration for list of animations and phonemes (same as [pran-phonemes#FRONTEND](#pran-phonemes-frontend)). Ability to trigger animations with also phonemes.

# -- pran-echo --
## <a name="pran-echo-core"></a> CORE
| Language | Type | Dependencies |
| ------ | ------ | ------ |
| Rust/Python | Application | [pran-phonemes#CORE](#pran-phonemes-core) |
#### Functionality
From audio to text, send text to [pran-phonemes#CORE](#pran-phonemes-core) and send results back to listener.
Local server to listen to from browser, probably websocket.

## <a name="pran-echo-frontend"></a> FRONTEND
| Language | Type | Dependencies |
| ------ | ------ | ------ |
| HTML5 | Application | [pran-animation#FRONTEND](#pran-animation-frontend) + [pran-echo#CORE](#pran-echo-core) |
#### Functionality
Configure animation frontend with very few animations but all the phonemes. Gets audio in input, sends it to [pran-echo#CORE](#pran-echo-core), wait for results back, sends results to [pran-animation#FRONTEND](#pran-animation-frontend). Ideally being able to choose animations to show at different times through an intuitive UI.
Being able to output a gif/video of animation, use [MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder).


- Azioni draw contengono ID invece che path (mostrare ID in block editor)
- Muovere su e giu la timeline bar

- IMPOSSIBILE: Taglia primo secondo video prima di export
