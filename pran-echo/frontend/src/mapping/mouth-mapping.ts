export class MouthMapping {
  private readonly _mapKey: string = 'phonemeToImageMap';
  private readonly _imagesKey: string = 'images';

  private _phonemeToImagesMap: { [key: string]: string[] };
  private _imageMap: [id: string, path: string][];
  private _firstLoadPromise: Promise<void>;
  private _phonemeToIdsMap: Map<string, string[]>;

  private constructor() {
    this._firstLoadPromise = this._loadMaps();
  }

  public static create(): Promise<MouthMapping> {
    const mouthMapping = new MouthMapping();
    return mouthMapping._firstLoadPromise.then(() => mouthMapping);
  }

  public getImageMap(): [id: string, path: string][] {
    return this._imageMap;
  }

  public getPhonemeToIdsMap(): Map<string, string[]> {
    return this._phonemeToIdsMap;
  }

  public getFullMap(): { [key: string]: string[] } {
    return this._phonemeToImagesMap;
  }

  private _getDefaultMap(): Promise<{ [key: string]: string[] }> {
    return fetch('./resources/default-mouth-mapping.json')
      .then(response => response.json());
  }

  private async _loadMaps(): Promise<void> {
    const mapping = !!localStorage.getItem(this._mapKey)
      ? JSON.parse(localStorage.getItem(this._mapKey))
      : await this._getDefaultMap();

    const images = !!localStorage.getItem(this._imagesKey)
      ? JSON.parse(localStorage.getItem(this._imagesKey))
      : {};

    const keys = Object.keys(mapping);
    this._phonemeToImagesMap = {};
    for (let i = 0; i < keys.length; i++) {
      for (let j = 0; j < mapping[keys[i]].length; j++) {
        this._phonemeToImagesMap[keys[i]] = this._phonemeToImagesMap[keys[i]] || [];
        if (!!images[mapping[keys[i]][j]]) {
          this._phonemeToImagesMap[keys[i]][j] = images[mapping[keys[i]][j]];
        } else {
          this._phonemeToImagesMap[keys[i]][j] = mapping[keys[i]][j];
        }
      }
    }

    const phonemeToImagesMap: [phoneme: string, paths: string[]][] =
      Object.keys(this._phonemeToImagesMap).map(key => [key, this._phonemeToImagesMap[key]]);

    const imageToPhonemesMap: Map<string, string[]> = phonemeToImagesMap.reduce<Map<string, string[]>>((map: Map<string, string[]>, item: [phoneme: string, paths: string[]]) => {
      item[1].forEach((path => {
        let phonemes: string[] = [];
        if (map.has(path)) {
          phonemes = map.get(path);
        } else {
          map.set(path, phonemes);
        }
        phonemes.push(item[0]);
      }));
      return map;
    }, new Map<string, string[]>());

    this._imageMap = this._createImageMap(imageToPhonemesMap);
    const imageToIdMap: Map<string, string> = this._imageMap.reduce<Map<string, string>>((map: Map<string, string>, item) => {
      map.set(item[1], item[0]);
      return map;
    }, new Map<string, string>());

    this._phonemeToIdsMap = phonemeToImagesMap.reduce<Map<string, string[]>>((map, item) => {
      map.set(item[0], item[1].map(path => imageToIdMap.get(path)));
      return map;
    }, new Map<string, string[]>());
  }

  private _createImageMap(imageToPhonemesMap: Map<string, string[]>): [string, string][] {
    return this._unifyDuplicates(Array.from(imageToPhonemesMap, ([path, phonemes]) => {
      return [phonemes.join('/'), path];
    }));
  }

  // needed when we have 2 images that are only on one phoneme, for example "P": ["p1", "p2"]
  // imageMap will end up giving the same id "P" to both "p1" and "p2"
  // with this method we will end up having ids "P_1" and "P_2"
  private _unifyDuplicates(imageMap: [string, string][]): [string, string][] {
    const ids = new Set<string>();
    const duplicateIds = new Map<string, number>();
    imageMap.forEach(value => {
      if (ids.has(value[0])) {
        duplicateIds.set(value[0], 1);
      } else {
        ids.add(value[0]);
      }
    });

    return imageMap.map(value => {
      let result;

      if (duplicateIds.has(value[0])) {
        result = [`${value[0]}_${duplicateIds.get(value[0])}`, value[1]];
        duplicateIds.set(value[0], duplicateIds.get(value[0]) + 1);
      } else {
        result = [value[0], value[1]];
      }

      return result;
    });
  }

  public setNewMapping(mappingJson: { [key: string]: string[] }, images: { [name: string]: string }): void {
    localStorage.setItem(this._mapKey, JSON.stringify(mappingJson));
    localStorage.setItem(this._imagesKey, JSON.stringify(images));
  }

  public reset(): void {
    localStorage.removeItem(this._mapKey);
    localStorage.removeItem(this._imagesKey);
  }
}