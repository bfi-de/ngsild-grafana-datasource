import React, { ChangeEvent, PureComponent } from 'react';
import { InlineFormLabel, LegacyForms, Label, Select, Checkbox, Input } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps, SelectableValue } from '@grafana/data';
import { NgsildSourceOptions, NgsildSecureJsonData } from './types';

const { SecretFormField, FormField } = LegacyForms;

interface Props extends DataSourcePluginOptionsEditorProps<NgsildSourceOptions, NgsildSecureJsonData> {}

interface State {}

export class ConfigEditor extends PureComponent<Props, State> {

  onUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { options, onOptionsChange } = this.props;
    onOptionsChange({ ...options, url: event.currentTarget.value?.trim() });
  };

  onContextUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { options, onOptionsChange } = this.props;
    const jsonData = options.jsonData;
    const options2 = {...options, jsonData: {...jsonData, contextUrl: event.currentTarget.value?.trim() ||""}};
    onOptionsChange(options2);
  };

  onTimeseriesUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { options, onOptionsChange } = this.props;
    const jsonData = options.jsonData;
    const options2 = {...options, jsonData: {...jsonData, timeseriesUrl:event.currentTarget.value?.trim() ||""}};
    onOptionsChange(options2);
  };

  onAccessModeChange = (value: SelectableValue<string>) => {
    const { options, onOptionsChange } = this.props;
    onOptionsChange({ ...options, access: value.value || "proxy" });
  };

  onAuthStatusChange = (active: boolean) => {
    const { options, onOptionsChange } = this.props;
    const jsonData = { ...options.jsonData, authType: active ? "oauth" : undefined};
    onOptionsChange({ ...options, jsonData: jsonData });
  };

  onClientIdChange = (value: string) => {
    // removing the client id does not make sense, if this is desired then the authentication should rather be disabled
    // otherwise any config change would remove the configured id
    if (!value) 
      {return;}
    const { options, onOptionsChange } = this.props;
    const securejsonData = { ...(options.secureJsonData || {}), clientId: value };
    onOptionsChange({ ...options, secureJsonData: securejsonData });
  }

  onClientSecretChange = (value: string) => {
    // removing the client secret does not make sense, if this is desired then the authentication should rather be disabled
    // otherwise any config change would remove the configured secret
    if (!value) 
      {return;}
    const { options, onOptionsChange } = this.props;
    const securejsonData = { ...(options.secureJsonData || {}), clientSecret: value };
    onOptionsChange({ ...options, secureJsonData: securejsonData });
  }

  onTokenServerChange = (value: string) => {
    const { options, onOptionsChange } = this.props;
    const jsonData = { ...options.jsonData, tokenUrl: value };
    onOptionsChange({ ...options, jsonData: jsonData });
  }

  render() {
    const { options } = this.props;
    const { jsonData, secureJsonFields, secureJsonData } = options;
    const isAuthActive: boolean = jsonData.authType === "oauth" /*&& jsonData.tokenAuth === "tokenAuth"; */// TODO validate authType?
    const authConfigured: boolean = isAuthActive && secureJsonFields.clientId && secureJsonFields.clientSecret;
    return (
      <div className="gf-form-group">
        <div className="gf-form">
          <FormField
            label="Context broker URL"
            labelWidth={10}
            inputWidth={20}
            onChange={this.onUrlChange}
            value={options.url || ''}
            placeholder="http://localhost:1026"
          />
        </div>
        <div className="gf-form">
          <FormField
            label="Temporal broker URL"
            labelWidth={10}
            inputWidth={20}
            onChange={this.onTimeseriesUrlChange}
            value={jsonData.timeseriesUrl || ''}
            placeholder="http://localhost:1026"
          />
        </div>
        <div className="gf-form">
          <FormField
            label="Context URL"
            labelWidth={10}
            inputWidth={20}
            onChange={this.onContextUrlChange}
            value={jsonData.contextUrl || ''}
            placeholder="http://localhost:80/ngsi-context.jsonld"
          />
        </div>
        <div className="gf-form-inline">
          <div className="gf-form">
            <InlineFormLabel width={10} tooltip="Select the access mode for the plugin.">
              Access
            </InlineFormLabel>
            <Select
              options={[{value: "direct", title: "Send broker requests from the browser", label: "direct"}, {value: "proxy", title: "Send broker requests via the backend", label: "proxy"}]}
              value={options.access || "direct"}
              onChange={this.onAccessModeChange}
              width={20}
              />
          </div>
        </div>
        <div className="gf-form-inline">
          <div className="gf-form">
            <Checkbox
              checked={isAuthActive}
              onChange={c => this.onAuthStatusChange(c.currentTarget.checked)}
              label="Authentication active?"
              title="If checked, OAuth 2.0 authentication will be enabled for the datasource. Use with a context broker secured by means of OAuth."
            ></Checkbox>
          </div>
        </div>
        {isAuthActive &&
          <React.Fragment>
            <div className="gf-form-inline">
              <div className="gf-form">
                <InlineFormLabel width={10} tooltip="OAuth token server">
                  OAuth token URL
                </InlineFormLabel>
                <Input
                  value={jsonData.tokenUrl || ""}
                  placeholder={"https://my.auth.server.com/v1/oauth/token"}
                  onChange={evt => this.onTokenServerChange(evt.currentTarget.value?.trim())}
                  title="OAuth token server."
                ></Input>
              </div>
            </div>
            <div className="gf-form-inline">
              <div className="gf-form">
                <InlineFormLabel width={10} tooltip="OAuth client id. This must be configured in the authentication server, too.">
                  Client id
                </InlineFormLabel>
                <Input
                  value={secureJsonData?.clientId || ""}
                  placeholder={authConfigured ? "Value configured" : "No client id configured yet"}
                  onChange={evt => this.onClientIdChange(evt.currentTarget.value?.trim())}
                  title="OAuth client id. This must be configured in the authentication server."
                  type="password"
                ></Input>
              </div>
            </div>
            <div className="gf-form-inline">
              <div className="gf-form">
                <InlineFormLabel width={10} tooltip="OAuth client secret. This must be configured in the authentication server, too.">
                  Client secret
                </InlineFormLabel>
                <Input
                  value={secureJsonData?.clientSecret || ""}
                  placeholder={authConfigured ? "Value configured" : "No client secret configured yet"}
                  onChange={evt => this.onClientSecretChange(evt.currentTarget.value?.trim())}
                  title="OAuth client secret. This must be configured in the authentication server, too."
                  type="password"
                ></Input>
              </div>
            </div>
          </React.Fragment>
        }

      </div>
    );
  }
}
