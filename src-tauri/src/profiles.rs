//! Separate development from production without migrating or deleting either profile.
use tauri::utils::config::Config;

pub const DEVELOPMENT_IDENTIFIER: &str = "org.voz.prototype.dev";

pub fn configure(config: &mut Config, development: bool) {
    if development {
        config.identifier = DEVELOPMENT_IDENTIFIER.into();
        for window in &mut config.app.windows {
            window.title.push_str(" (Development)");
        }
    }
}

#[cfg(any(target_os = "linux", test))]
pub fn bridge_directory(development: bool) -> &'static str {
    if development {
        "gosu-speech-to-text-dev"
    } else {
        "gosu-speech-to-text"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn config() -> Config {
        serde_json::from_str(include_str!("../tauri.conf.json")).unwrap()
    }

    #[test]
    fn production_configuration_is_preserved_exactly() {
        let mut production = config();
        let before = serde_json::to_value(&production).unwrap();
        configure(&mut production, false);
        assert_eq!(serde_json::to_value(production).unwrap(), before);
        assert_eq!(bridge_directory(false), "gosu-speech-to-text");
    }

    #[test]
    fn tauri_resolves_separate_persistent_directories_without_creating_windows() {
        use tauri::{
            test::{mock_builder, mock_context, noop_assets},
            Manager,
        };
        let directories = |development| {
            let mut context = mock_context(noop_assets());
            *context.config_mut() = config();
            configure(context.config_mut(), development);
            // Test the real Tauri path resolver without creating a WebView or touching user data.
            context.config_mut().app.windows.clear();
            let app = mock_builder().build(context).unwrap();
            let path = app.path();
            [
                path.app_data_dir().unwrap(),
                path.app_local_data_dir().unwrap(),
                path.app_config_dir().unwrap(),
                path.app_cache_dir().unwrap(),
                path.app_log_dir().unwrap(),
            ]
        };
        let production = directories(false);
        let development = directories(true);
        for (production, development) in production.iter().zip(&development) {
            assert_ne!(production, development);
            assert!(production
                .components()
                .any(|part| part.as_os_str() == "org.voz.prototype"));
            assert!(development
                .components()
                .any(|part| part.as_os_str() == DEVELOPMENT_IDENTIFIER));
        }
    }

    #[test]
    fn development_has_its_own_identity_without_changing_production_or_security() {
        let production = config();
        let mut development = config();
        configure(&mut development, true);
        assert_eq!(production.identifier, "org.voz.prototype");
        assert_eq!(development.identifier, DEVELOPMENT_IDENTIFIER);
        assert_ne!(bridge_directory(true), bridge_directory(false));
        let mut actual = serde_json::to_value(development).unwrap();
        let expected = serde_json::to_value(production).unwrap();
        assert!(actual["app"]["windows"][0]["title"]
            .as_str()
            .unwrap()
            .ends_with(" (Development)"));
        actual["identifier"] = expected["identifier"].clone();
        for (actual_window, expected_window) in actual["app"]["windows"]
            .as_array_mut()
            .unwrap()
            .iter_mut()
            .zip(expected["app"]["windows"].as_array().unwrap())
        {
            actual_window["title"] = expected_window["title"].clone();
        }
        assert_eq!(actual, expected);
        let overlay: serde_json::Value =
            serde_json::from_str(include_str!("../tauri.dev.conf.json")).unwrap();
        assert_eq!(overlay["identifier"], DEVELOPMENT_IDENTIFIER);
    }
}
