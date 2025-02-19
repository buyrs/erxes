import ControlLabel from '@erxes/ui/src/components/form/Label';
import DateControl from '@erxes/ui/src/components/form/DateControl';
import FormGroup from '@erxes/ui/src/components/form/Group';
import Icon from '@erxes/ui/src/components/Icon';
import moment from 'moment';
import queryString from 'query-string';
import React from 'react';
import Tip from '@erxes/ui/src/components/Tip';
import { router } from '@erxes/ui/src/utils';
import { __ } from '@erxes/ui/src';
import { DateContainer } from '@erxes/ui/src/styles/main';
import { SidebarList as List, Wrapper } from '@erxes/ui/src/layout';
import { IQueryParams } from '@erxes/ui/src/types';
import Button from '@erxes/ui/src/components/Button';
import FormControl from '@erxes/ui/src/components/form/Control';
import { CustomRangeContainer, FilterContainer } from '../styles';
import { EndDateContainer } from '@erxes/ui-forms/src/forms/styles';

interface Props {
  history: any;
  queryParams: any;
}

type State = {
  filterParams: IQueryParams;
};

const { Section } = Wrapper.Sidebar;

const generateQueryParams = ({ location }) => {
  return queryString.parse(location.search);
};

class Sidebar extends React.Component<Props, State> {
  constructor(props) {
    super(props);

    this.state = {
      filterParams: this.props.queryParams,
    };
  }

  isFiltered = (): boolean => {
    const params = generateQueryParams(this.props.history);

    for (const param in params) {
      if (['posId', 'startDate', 'endDate', 'userId'].includes(param)) {
        return true;
      }
    }

    return false;
  };

  clearFilter = () => {
    const params = generateQueryParams(this.props.history);
    router.removeParams(this.props.history, ...Object.keys(params));
  };

  setFilter = (name, value) => {
    const { filterParams } = this.state;
    this.setState({ filterParams: { ...filterParams, [name]: value } });
  };

  onSelectDate = (value, name) => {
    const strVal = moment(value).format('YYYY-MM-DD HH:mm');
    this.setFilter(name, strVal);
  };

  runFilter = () => {
    const { filterParams } = this.state;

    router.setParams(this.props.history, { ...filterParams, page: 1 });
  };

  render() {
    const { filterParams } = this.state;

    return (
      <Wrapper.Sidebar hasBorder={true}>
        <Section.Title>
          {__('Filters')}
          <Section.QuickButtons>
            {this.isFiltered() && (
              <a href="#cancel" tabIndex={0} onClick={this.clearFilter}>
                <Tip text={__('Clear filter')} placement="bottom">
                  <Icon icon="cancel-1" />
                </Tip>
              </a>
            )}
          </Section.QuickButtons>
        </Section.Title>
        <FilterContainer>
          <List id="SettingsSidebar">
            <CustomRangeContainer>
              <FormGroup>
                <ControlLabel required={true}>{__(`Start Date`)}</ControlLabel>
                <DateContainer>
                  <DateControl
                    name="startDate"
                    dateFormat="YYYY/MM/DD"
                    timeFormat={true}
                    placeholder="Choose date"
                    value={filterParams.startDate || ''}
                    onChange={(value) => this.onSelectDate(value, 'startDate')}
                  />
                </DateContainer>
              </FormGroup>
              <FormGroup>
                <ControlLabel required={true}>{__(`End Date`)}</ControlLabel>
                <EndDateContainer>
                  <DateContainer>
                    <DateControl
                      name="endDate"
                      dateFormat="YYYY/MM/DD"
                      timeFormat={true}
                      placeholder="Choose date"
                      value={filterParams.endDate || ''}
                      onChange={(value) => this.onSelectDate(value, 'endDate')}
                    />
                  </DateContainer>
                </EndDateContainer>
              </FormGroup>
            </CustomRangeContainer>
            <FormGroup>
              <ControlLabel>Search Datas</ControlLabel>
              <FormControl
                name="searchConsume"
                onChange={(e) =>
                  this.setFilter('searchConsume', (e.target as any).value)
                }
                defaultValue={filterParams.searchConsume}
              />
            </FormGroup>
            <FormGroup>
              <ControlLabel>Search Error</ControlLabel>
              <FormControl
                name="searchError"
                onChange={(e) =>
                  this.setFilter('searchError', (e.target as any).value)
                }
                defaultValue={filterParams.searchError}
              />
            </FormGroup>
          </List>
          <Button
            block={true}
            btnStyle="success"
            uppercase={false}
            onClick={this.runFilter}
            icon="filter"
          >
            {__('Filter')}
          </Button>
        </FilterContainer>
      </Wrapper.Sidebar>
    );
  }
}

export default Sidebar;
