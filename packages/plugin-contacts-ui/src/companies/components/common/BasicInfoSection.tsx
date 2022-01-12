import Sidebar from '@erxes/ui/src/layout/components/Sidebar';
import { IField } from '@erxes/ui-settings/src/properties/types';
import React from 'react';
import { ICompany } from '../../types';
import DetailInfo from './DetailInfo';

type Props = {
  company: ICompany;
  fields: IField[];
};

class BasicInfoSection extends React.Component<Props> {
  render() {
    const { Section } = Sidebar;
    const { company, fields } = this.props;

    return (
      <Section>
        <DetailInfo company={company} fields={fields} />
      </Section>
    );
  }
}

export default BasicInfoSection;
