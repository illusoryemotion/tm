import {
    App,
    Editor,
    MarkdownView,
    Modal,
    Notice,
    Plugin,
    PluginSettingTab,
    Setting,
    ButtonComponent,
    TextComponent,
    setIcon,
    TFile,
    Platform,
    TextAreaComponent
} from 'obsidian';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
    mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
    mySetting: 'default'
}

export default class MyPlugin extends Plugin {
    settings: MyPluginSettings;

    async onload() {
        await this.loadSettings();
        /*
        // This creates an icon in the left ribbon.
        const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
            // Called when the user clicks the icon.
            new Notice('This is a notice!');
        });
        // Perform additional things with the ribbon
        ribbonIconEl.addClass('my-plugin-ribbon-class');
        */
        /*
        // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
        const statusBarItemEl = this.addStatusBarItem();
        statusBarItemEl.setText('Status Bar Text');
        */

        // This adds a simple command that can be triggered anywhere
        this.addCommand({
            id: 'open-sample-modal-simple',
            name: 'Open sample modal (simple)',
            callback: () => {
                new SampleModal(this.app).open();
            }
        });
        // This adds an editor command that can perform some operation on the current editor instance
        this.addCommand({
            id: 'sample-editor-command',
            name: 'Sbample editor command',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                console.log(editor.getSelection());
                editor.replaceSelection('Sbample Editor Command');
            }
        });
        // This adds a complex command that can check whether the current state of the app allows execution of the command
        this.addCommand({
            id: 'open-sample-modal-complex',
            name: 'Open sample modal (complex)',
            checkCallback: (checking: boolean) => {
                // Conditions to check
                const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (markdownView) {
                    // If checking is true, we're simply "checking" if the command can be run.
                    // If checking is false, then we want to actually perform the operation.
                    if (!checking) {
                        new SampleModal(this.app).open();
                    }

                    // This command will only show up in Command Palette when the check function returns true
                    return true;
                }
            }
        });

        /**
         * Add "delete attachment" command to editor menu
         */
        this.registerEvent(
            this.app.workspace.on("editor-menu", (menu, editor, view) => {
                menu.addItem((item) => {
                    item
                        .setTitle("Debug Menu")
                        .setIcon("document")
                        .onClick(async () => {
                            console.info(
                                "Editor??", editor,
                                "View!!", view,
                                "Item!!", item,
                                "menu!!", menu.items[2].callback.toString()
                            );
                        });
                });
            })
        );

        // This adds a settings tab so the user can configure various aspects of the plugin
        this.addSettingTab(new SampleSettingTab(this.app, this));

        // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
        // Using this function will automatically remove the event listener when this plugin is disabled.
        this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
            console.log('click', evt);
        });

        // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
        this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
    }

    onunload() {

    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class SampleModal extends Modal {
    constructor(app: App) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.setText('Woah!');
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

class SampleSettingTab extends PluginSettingTab {
    plugin: MyPlugin;

    constructor(app: App, plugin: MyPlugin) {
        super(app, plugin);
        this.plugin = plugin;
        this.regReplaced = 0;
    }

    /**
     * From Obsidian keyshots
     * https://github.com/KrazyManJ/obsidian-keyshots/tree/master/src
     */
    private parseEscapes(str: string) {
        return str.replace(/\\n/g, "\n")
            .replace(/\\t/g, "\t")
            .replace(/\\f/g, "\f")
            .replace(/\\b/g, "\b");
    }

    public getRegex(pattern: string): RegExp | undefined {
        if (pattern === "") return undefined
        try {
            return new RegExp(
                pattern,
                //  `gm${this.case_sensitive ? "" : "i"}`
                `gm`
            )
        } catch (SyntaxError) {
            return undefined
        }
    }

    async checkAndReplace() {
        if (!this.regReplaceQueue.length) {
            if (this.regReplaced) {
                this.notice.setMessage(
                    `${this.regReplaced} files modified!`
                );
                console.info("tm:",`${this.regReplaced} files modified!`,this.regReplacedList);
            } else {
                this.notice.setMessage(
                    `No matches found to replace.`
                );
            }
            this.plugin.data.msDocConverted = true;
            this.plugin.saveSettings().then(() => this.display());

            setTimeout(() => {
                this.notice.hide();
                this.notice = undefined;
            }, 2000);
            return;
        }
        setTimeout(async () => {
            const file = this.regReplaceQueue.shift();
            const contents = await this.app.vault.read(file);
            const pattern = this.plugin.settings.regFindPattern;
            const replacement = this.plugin.settings.regReplaceString;
            if (pattern.test(contents)) {
                this.regReplacedList.push(file.basename);
                this.regReplaced++;
                this.notice.setMessage(`${this.regReplaceQueue.length} / ${this.mdFileCount} files left`);
                await this.plugin.app.vault.modify(
                    file,
                    contents.replace(
                        pattern,
                        replacement
                    )
                );
            }
            this.checkAndReplace();
        });
    }


    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        
        /* Example setting 
        new Setting(containerEl)
            .setName('Setting #1')
            .setDesc("set that")
            .addText(text => text
                .setPlaceholder('Enter your secret')
                .setValue(this.plugin.settings.mySetting)
                .onChange(async (value) => {
                    this.plugin.settings.mySetting = value;
                    await this.plugin.saveSettings();
                }));
        */
        /*
         * This function is adapted from Admonitions.
         * Original source: https://github.com/javalent/admonitions/blob/main/src/settings.ts#L55.
         *
         * The original project is licensed under MIT License.
         * 
         * Author(s) of the original code: https://github.com/javalent.
         */

        new Setting(containerEl)
            .setName("Regex replace all notes")
            .setDesc(
                createFragment((e) => {
                    const text = e.createDiv("admonition-convert");
                    text.createSpan({
                        text: "This "
                    });
                    text.createEl("strong", { text: "will" });
                    text.createSpan({
                        text: " modify notes. Use at your own risk and please make backups."
                    });
                    e.createEl("p", {
                        text: "With large vaults, this could take awhile!"
                    });
                })
            )
            .addText(text => text
                .setPlaceholder('Find (regex)')
                .setValue(this.plugin.settings.regFindPatternString)
                .onChange(async (value) => {
                    this.plugin.settings.regFindPatternString = value;
                    this.plugin.settings.regFindPattern = this.getRegex(value);
                    await this.plugin.saveSettings();
                })
            )
            .addText(text => text
                .setPlaceholder('Replace with')
                .setValue(this.plugin.settings.regReplaceString)
                .onChange(async (value) => {
                    this.plugin.settings.regReplaceString = value;
                    await this.plugin.saveSettings();
                })
            )
            .addButton((b) =>
                b
                .setButtonText("Replace")
                .setCta()
                .onClick(() => {
                    this.regReplaceQueue = this.plugin.app.vault.getMarkdownFiles();
                    this.mdFileCount = this.regReplaceQueue.length;
                    this.regReplaced = 0;
                    this.regReplacedList = [];
                    this.notice = new Notice(
                        createFragment((e) => {
                            const container =
                                e.createDiv("admonition-convert");
                            container.createSpan({
                                text: "Replacing..."
                            });
                        }),
                        0
                    );
                    this.checkAndReplace();
                })
            );
    }
}
//

/* Patch file explorer:
https://github.com/polyipseity/obsidian-show-hidden-files/blob/main/sources/show-hidden-files.ts

Regex parse
https://github.com/KrazyManJ/obsidian-keyshots/tree/master/src

https://github.com/mProjectsCode/obsidian-meta-bind-plugin/blob/master/packages/core/src/fields/embed/EmbedMountable.ts#L68
https://github.com/mProjectsCode/obsidian-meta-bind-plugin/blob/4b16a75fb63dfdb34e3ccf2756a324a84dd8fd85/packages/obsidian/src/ObsidianInternalAPI.ts#L61
*/