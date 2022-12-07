import { DataSourcePlugin } from '@grafana/data';
import { NgsildDataSource } from './datasource';
import { ConfigEditor } from './ConfigEditor';
import { QueryEditor } from './QueryEditor';
import { NgsildQuery, NgsildSourceOptions } from './types';

export const plugin = new DataSourcePlugin<NgsildDataSource, NgsildQuery, NgsildSourceOptions>(NgsildDataSource)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(QueryEditor);
