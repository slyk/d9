import { cssVar } from '@wbce-d9/utils/browser';

const svg = (color: string, hide: boolean) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
	<style>
		circle {
			fill: ${color};
		}
	</style>

	<circle cx="100" cy="100" r="100"/>

	${
		hide
			? ''
			: '<g transform="translate(45.2,50.9) scale(0.44)" fill="#FFF">' +
			  '<path d="M 15,0 H 132 C 162,0 187,10 210,29 L 168,71 C 156,60 145,55 130,55 H 64 Q 60,55 60,59 V 223 H 15 Q 0,223 0,208 V 15 Q 0,0 15,0 Z"/>' +
			  '<path d="M 226,48 C 241,67 249,89 249,112 C 249,174 197,223 132,223 H 77 V 181 Q 77,165 93,165 H 130 C 163,165 187,141 187,112 C 187,104 186,98 182,92 Z"/>' +
			  '</g>'
	}
</svg>`;

export function setFavicon(color: string | null | undefined, hide = false): void {
	color = color || cssVar('--primary');

	const icon = svg(color, hide);
	const wrapper = document.createElement('div');
	wrapper.innerHTML = icon.trim();

	if (wrapper.firstChild) {
		const iconSerialized = new XMLSerializer().serializeToString(wrapper.firstChild);

		const string = 'data:image/svg+xml;base64,' + window.btoa(iconSerialized);

		const link: HTMLLinkElement = document.querySelector("link[rel*='icon']") || document.createElement('link');
		link.type = 'image/x-icon';
		link.rel = 'icon';
		link.href = string;
		document.getElementsByTagName('head')[0].appendChild(link);
	}
}
