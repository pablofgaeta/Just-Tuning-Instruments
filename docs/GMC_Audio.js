let AudioController = (function() {
    // let keys = [ 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', '\'' ];

    function JustScale(ratios, base_frequency) {
        return ratios.map(ratio => {
            return ratio * base_frequency;
        });
    }
    
    function ETScale(delta_midis, base_midi_note) {
        return delta_midis.map(delta_midi => {
            return Tone.Frequency(delta_midi + base_midi_note, 'midi');
        });
    }

    let JustRatios = {
        'slendro' : [1, 1.3125, 1.5, 1.75, 1.875, 2],
        'mP'      : [1, 32/27, 4/3, 3/2, 16/9, 2]
    };
    
    let ETRelatives = {
        'M'       : [0, 2, 4, 5, 7, 9, 11, 12],
        'MP'      : [0, 2, 4, 7, 9]
    };

    class Scale {
        constructor(opts = null) {
            this.base = 440;
            this.type = 'just';
            this.relatives = JustRatios['slendro'];

            Object.keys(opts).forEach(key => {
                if (this.hasOwnProperty(key))
                    this[key] = opts[key];
            });

            this.update_base(this.base);
        }
        
        update_base(base_frequency) {
            this.base = base_frequency;
            switch (this.type) {
                case 'just':
                    this.notes = JustScale(this.relatives, this.base);
                    break;
                case 'et':
                    this.notes = ETScale(this.relatives, this.base);
                    break;
                default:
                    throw "Scale type note implemented";
            }
            this.notes_str = this.notes.map(note => note + 'hz');
            return this.notes;
        }

        random_note() {
            return this.notes[ Math.floor(Math.random() * (this.notes.length - 1)) ];
        }
    }

    class Synth {
        constructor(opts) {
            this.polyphony = 10;
            this.release = '8n';
            Object.keys(opts).forEach(key => { this[key] = opts[key]; });
            this.scale = new Scale(opts);

            this.tone = new Tone.PolySynth(this.polyphony, Tone.AMSynth, {
                modulation: {
                    type: 'sine'
                }
            }).toMaster();
        }

        get notes() {
            return this.scale.notes;
        }

        play_random() {
            this.play(this.scale.random_note());
        }

        /**
         * 
         * @param {Array} frequencies 
         */
        play_frequencies(frequencies) {
            if (Array.isArray(frequencies) || typeof frequencies == 'number') {
                this.tone.triggerAttackRelease(
                    frequencies, this.release
                );
            }
        }

        /**
         * 
         * @param {Array} scale_state_array 
         */
        play(scale_state_array) {
            if (! ( scale_state_array.hasOwnProperty('length') && scale_state_array.length == this.notes.length ) ) {
                throw "scale_state_array length must be equal to the current scale length";
            }

            let frequencies = [];
            for (let i = 0; i < scale_state_array.length; ++i) {
                if (scale_state_array[i])
                    frequencies.push(this.scale.notes_str[i]);
            }

            this.tone.triggerAttackRelease(
                frequencies, this.release
            );
        }
    }

    return {
        'JustRatios'  : JustRatios,
        'ETRelatives' : ETRelatives,
        'Synth'       : Synth
    }
})();

// class ETSynth {
//     static keys = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'];
//     static default = {
//         base : 440,
//         polyphony : 10,
//         release : '8n'
//     }

//     constructor(divisions = 12, opts = {}) {
//         this.settings = {...ETSynth.default};
//         Object.keys(opts).forEach(key => { this.settings[key] = opts[key]; });

//         this.set_divisions(divisions);
//         this.tone = new Tone.PolySynth(this.settings.polyphony, Tone.FMSynth, {
//             modulation: {
//                 type: 'sine'
//             }
//         }).toMaster();
//     }

//     set_divisions(val) {
//         if (typeof val != 'number' || val == 0) {
//             console.log("Invalid division assignment");
//             return;
//         }

//         this.notes = [];
//         let ratio = Math.pow(2, 1 / val);
//         for (var i = 0; i < Math.floor(val); ++i) {
//             this.notes.push(this.settings.base * Math.pow(ratio, i + 1));
//         }
//     }

//     play(key) {
//         let index = ETSynth.keys.indexOf(key);
//         if (index != -1 && index < this.notes.length) {
//             this.tone.triggerAttackRelease(
//                 this.notes[index] + 'hz', this.settings.release
//             );
//         }
//     }
// }

// document.onkeypress = (event) => {
//     let key_index = CustomInstrument.keys.indexOf(event.key);
//     if (key_index != -1) {

//     }
// }

class AudioPlayer { 
    constructor() { }

    spawn_menu(gui, name) {
        throw "spawn_menu must be implemented in derived class";
    }

    trigger() {
        throw "Trigger must be implemented in derived class";
    }
}

class AFM {
    constructor() {
        this.file2url = {};

        this.sample_input = document.createElement("input");
        this.sample_input.type = 'file';
        this.sample_input.accept = 'audio/*';
        this.sample_input.multiple = true;
    }

    get files() { return Object.keys(this.file2url);   }
    get urls()  { return Object.values(this.file2url); }

    add(filename, url) {
        this.file2url[filename] = this.file2url[filename] || url;
    }
    
    play(filename) {
        if (this.file2url.hasOwnProperty(filename)) {
            new Tone.Player({
                url: this.file2url[filename],
                autostart: true
            }).toMaster();
        }
    }
};

const AudioFileManager = new AFM();

/**
 *
 * @param {Number} base_frequency - frequency in hz
 */
class GMCSynth extends AudioPlayer {
    static default_opts = {
        'base' : 440
    };

    constructor(opts = GMCSynth.default_opts) {
        super();
        // Add any new options
        this.current_ops = {...GMCSynth.default_opts};
        Object.keys(opts).forEach(key => { this.current_ops[key] = opts[key]; });

        this.instrument = new AudioController.Synth(opts);
        this.note_states = new Array(this.instrument.notes.length).fill(false).fill(true, 0, 1);
    }

    update_note_inclusion(index, state) {
        if (index < this.note_states.length) {
            this.note_states[index] = state;
        }
    }

    /**
     * Returns the Synth's note length in ms
     */
    get duration() { 
        return Tone.Time(this.instrument.release).toSeconds() * 1000; 
    }

    get notes_str() { 
        return this.instrument.notes.map(freq => freq + 'hz'); 
    }

    /**
     * Plays a note or chord based on the input frequencies and current instrument
     * @param {String} - freqs : String or array of strings representing frequencies to play
     */
    __play(freqs = this.playing_notes) {
        this.instrument.play(freqs);
    };

    /**
     * Plays a random note from the current instrument's scale
     */
    random() { 
        this.instrument.play_random(); 
    }

    /**
     * Generic trigger of the synth by user
     */
    trigger() { 
        this.instrument.play(this.note_states); 
    }

    update_base(frequency) {
        this.instrument.scale.update_base(frequency);
    }
}


class GMCSampler extends AudioPlayer {
    constructor(sample) {
        super();
        this.set_sample(sample);
    }

    /** 
     * @param {Number} sample_index : Index of loaded samples to use for sampler
    */
    set_sample(sample) {
        if (AudioFileManager.file2url.hasOwnProperty(sample)) {
            const sample_url = AudioFileManager.file2url[sample];
            this.sampler = new Tone.Player(sample_url).toMaster();
        }
        else {
            console.log('No samples are loaded, cannot set');
        }
    }

    get duration() {
        return this.sampler.buffer.duration * 1000;
    }

    trigger() {
        if (this.sampler.buffer.loaded) {
            this.sampler.start();
        }
        else {
            console.log("Sample hasn't been loaded");
        }
    }
}
