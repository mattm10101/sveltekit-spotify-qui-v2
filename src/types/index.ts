// src/types/index.ts

export interface CurrentlyPlaying {
	is_playing: boolean;
	item: {
		name: string;
		artists: {
			name:string;
		}[];
		album: {
			name:string;
			images: {
				url:string;
			}[];
		};
	};
	device?: { // Make device optional as it's not always present
		volume_percent: number;
	};
}