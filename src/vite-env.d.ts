/// <reference types="vite/client" />

// Google Maps Places API (loaded dynamically at runtime)
interface Window {
  google?: {
    maps?: {
      places?: {
        Autocomplete: new (
          input: HTMLInputElement,
          opts?: { types?: string[]; fields?: string[] }
        ) => {
          getPlace: () => { formatted_address?: string };
          addListener: (event: string, handler: () => void) => void;
        };
      };
    };
  };
}
