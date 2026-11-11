#include <webkit2/webkit2.h>
#include <stdio.h>
#include <string.h>
static int status = 2;
static const char *html = "<html><script>const r=indexedDB.open('keyval-store',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('keyval'))r.result.createObjectStore('keyval')};r.onsuccess=()=>{r.result.close();window.webkit.messageHandlers.report.postMessage('OPENED')};r.onerror=()=>window.webkit.messageHandlers.report.postMessage('ERROR '+r.error.name+': '+r.error.message);</script></html>";
static gboolean quit_later(gpointer p){gtk_main_quit();return FALSE;}
static void report(WebKitUserContentManager *m, WebKitJavascriptResult *r, gpointer p){
 char *s=jsc_value_to_string(webkit_javascript_result_get_js_value(r));
 puts(s);fflush(stdout);status=!strcmp(s,"OPENED")?0:1;g_free(s);g_timeout_add(500,quit_later,NULL);
}
static void scheme(WebKitURISchemeRequest *r, gpointer p){
 GInputStream *s=g_memory_input_stream_new_from_data(html,strlen(html),NULL);
 webkit_uri_scheme_request_finish(r,s,strlen(html),"text/html");g_object_unref(s);
}
int main(int argc,char **argv){
 if(argc!=2)return 3;
 gtk_init(&argc,&argv);
 printf("WEBKIT %u.%u.%u\n",webkit_get_major_version(),webkit_get_minor_version(),webkit_get_micro_version());fflush(stdout);
 WebKitWebsiteDataManager *data=webkit_website_data_manager_new("base-data-directory",argv[1],"base-cache-directory",argv[1],NULL);
 WebKitWebContext *context=webkit_web_context_new_with_website_data_manager(data);
 webkit_web_context_register_uri_scheme(context,"tauri",scheme,NULL,NULL);
 WebKitSecurityManager *security=webkit_web_context_get_security_manager(context);
 webkit_security_manager_register_uri_scheme_as_secure(security,"tauri");
 webkit_security_manager_register_uri_scheme_as_local(security,"tauri");
 WebKitUserContentManager *manager=webkit_user_content_manager_new();
 webkit_user_content_manager_register_script_message_handler(manager,"report");
 g_signal_connect(manager,"script-message-received::report",G_CALLBACK(report),NULL);
 GtkWidget *view=g_object_new(WEBKIT_TYPE_WEB_VIEW,"web-context",context,"user-content-manager",manager,NULL);
 GtkWidget *window=gtk_window_new(GTK_WINDOW_TOPLEVEL);gtk_container_add(GTK_CONTAINER(window),view);gtk_widget_show_all(window);
 webkit_web_view_load_uri(WEBKIT_WEB_VIEW(view),"tauri://localhost/");
 g_timeout_add_seconds(20,quit_later,NULL);gtk_main();return status;
}
