import React from 'react';
import { ControlLabel, FormControl, FormGroup, __ } from 'erxes-ui';
import { FlexItem, FlexPad } from 'modules/common/components/step/styles';
import { SubHeading } from 'modules/settings/styles';
import { ITag } from 'modules/tags/types';

type Props = {
  disclaimer: boolean;
  importName: string;
  tags: ITag[];
  tagId: string;

  onChangeImportName: (value) => void;
  onChangeDisclaimer: (value) => void;
  onChangeTag: (tagId) => void;
};

class Details extends React.Component<Props, {}> {
  onChangeName = e => {
    const value = (e.currentTarget as HTMLInputElement).value;

    this.props.onChangeImportName(value);
  };

  onChangeDisclaimer = e => {
    const value = e.target.checked;

    this.props.onChangeDisclaimer(value);
  };

  onChangeTag = e =>
    this.props.onChangeTag((e.target as HTMLInputElement).value);

  render() {
    const { disclaimer, importName } = this.props;

    return (
      <FlexItem>
        <FlexPad direction="column" overflow="auto" value={importName}>
          <SubHeading>{__('Details')}</SubHeading>

          <FormGroup>
            <ControlLabel required={true}>{__('Import Name')}</ControlLabel>
            <p>
              {__(
                'Giving it a name helps with identifying items in the imports history.'
              )}
              .
            </p>
            <FormControl
              required={true}
              name="title"
              value={importName}
              onChange={this.onChangeName}
            />
          </FormGroup>

          <FormGroup>
            <ControlLabel>{__('Tag this items')}</ControlLabel>
            <p>{__('Tag these itemsLeave unselected if not necessary')}.</p>
            <FormControl
              componentClass="select"
              onChange={this.onChangeTag}
              value={this.props.tagId}
            >
              <option />
              {this.props.tags.map(tag => (
                <option key={tag._id} value={tag._id}>
                  {tag.name}
                </option>
              ))}
            </FormControl>
          </FormGroup>

          <FormGroup>
            <FormControl
              componentClass="checkbox"
              required={true}
              name="title"
              checked={disclaimer}
              onChange={this.onChangeDisclaimer}
            />
            <ControlLabel required={true}>{__('Disclaimer')}</ControlLabel>

            <p>
              {__(
                `I agree that all contacts in this import are expecting to hear from my organization. I have a prior relationship with these contacts and have emailed them at least once in the past year. I can confirm this list wasn't purchased, rented, appended, or provided by a third party`
              )}
              .
            </p>
          </FormGroup>
        </FlexPad>
      </FlexItem>
    );
  }
}

export default Details;
