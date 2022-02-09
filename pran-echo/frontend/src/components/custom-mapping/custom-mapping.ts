import './custom-mapping.css';
import { ModalContentInputs } from 'pran-animation-editor-frontend';
import { inlineComponent, onChange, onClick } from 'pran-gular-frontend';
import { MouthMapping } from '../../mapping/mouth-mapping';

type CustomMappingModalInputs = ModalContentInputs<void> & {
  mouthMapping: MouthMapping;
};

export const createCustomMapping = inlineComponent<CustomMappingModalInputs>(controls => {
  controls.setup('custom-mapping');

  let mappingFile: File,
    imageFiles: FileList;

  return inputs => [`
<div class="custom-mapping_container">
    <p class="custom-mapping_top-explanation">
        Download the template and change all the resource names into your file names you need to associate with the phoneme.
        For example, if you want your file "bSound.png" to be used for the phoneme "B" then change "B": ["./resources/mouth/m,b,silent.png"] present in the template into "B": ["bSound.png"]
    </p>
    <button type="button" class="custom-mapping_download-template-button g-button g-button-s">Download template</button>
    <p class="custom-mapping_upload-mapping-explanation">
        Upload the modified json here
    </p>
    <div class="custom-mapping_upload-mapping-container">
      <input type="file" id="upload_custom_mapping" accept=".json" hidden />
      <button class="custom-mapping_upload-mapping g-button g-button-s" type="button">Upload mapping</button>
      ${!!mappingFile ? `<span class="custom-mapping_upload-mapping-done">Done!</span>` : ``}
    </div>
    <p class="custom-mapping_upload-mapping-explanation">
        Upload all the images specified in the json here, you have to multiselect them all at once so make sure they are all in the same folder
    </p>
    <div class="custom-mapping_upload-images-container">
      <input type="file" id="upload_custom_images" multiple accept=".png" hidden />
      <button class="custom-mapping_upload-images g-button g-button-s" type="button">Upload images</button>
      ${!!imageFiles?.length ? `<span class="custom-mapping_upload-images-done">Done!</span>` : ``}
    </div>
    <div class="custom-mapping_go-button-container">
        <button class="custom-mapping_reset g-button g-button-s g-button-negative" type="button">RESET DEFAULTS</button>
        <button class="custom-mapping_go g-button g-button-secondary" type="button">Press here when you have done!</button>
    </div>
</div>
  `, e => (
    onClick(e, '.custom-mapping_download-template-button', () => downloadTemplate(inputs.mouthMapping)),
    onClick(e, '.custom-mapping_upload-mapping', () => triggerUploadMapping(e)),
    onClick(e, '.custom-mapping_upload-images', () => triggerUploadImages(e)),
    onChange(e, '#upload_custom_mapping', (change) => (mappingFile = change.target.files[0], controls.changed())),
    onChange(e, '#upload_custom_images', (change) => (imageFiles = change.target.files, controls.changed())),
    onClick(e, '.custom-mapping_go', () => go(mappingFile, imageFiles, inputs.mouthMapping)),
    onClick(e, '.custom-mapping_reset', () => reset(inputs.mouthMapping))
  )];
});

function downloadTemplate(mouthMapping: MouthMapping): void {
  const template = mouthMapping.getFullMap();
  const data = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(template));
  const a = document.createElement("a");
  document.body.appendChild(a);
  (a as any).style = "display: none";
  a.href = data;
  a.download = "template.json";
  a.click();
  document.body.removeChild(a);
}

function triggerUploadMapping(componentElement) {
  componentElement.querySelector("#upload_custom_mapping").click();
}

function triggerUploadImages(componentElement) {
  componentElement.querySelector("#upload_custom_images").click();
}

async function go(mappingFile: File, imagesFiles: FileList, mouthMapping: MouthMapping) {
  const mappingJson: { [key: string]: string[] } = JSON.parse(await readFilePromise(mappingFile));
  const imagesBase64: { [name: string]: string } = {};
  for (let i = 0; i < imagesFiles.length; i++) {
    imagesBase64[imagesFiles.item(i).name] = await readImagePromise(imagesFiles.item(i));
  }

  // todo: add check that the images are all provided

  mouthMapping.setNewMapping(mappingJson, imagesBase64);
  location.reload();
}

function reset(mouthMapping: MouthMapping) {
  mouthMapping.reset();
  location.reload();
}

function readFilePromise(file: File): Promise<string> {
  return new Promise((r, rj) => {
    const reader: FileReader = new FileReader();
    reader.onload = (evt) => {
      r(evt.target.result as string);
    };
    reader.onerror = (evt) => {
      rj();
    };
    reader.readAsText(file, 'UTF-8');
  });
}

function readImagePromise(imageFile): Promise<string> {
  return new Promise((r, rj) => {
    const reader: FileReader = new FileReader();
    reader.onload = (evt) => {
      r(evt.target.result as string);
    };
    reader.onerror = (evt) => {
      rj();
    };
    reader.readAsDataURL(imageFile);
  });
}