import { router, __ } from '@erxes/ui/src/utils';

import CategoryForm from '@erxes/ui-products/src/containers/CategoryForm';
import { Header } from '@erxes/ui-settings/src/styles';
import BrandFilter from '@erxes/ui/src/brands/components/BrandFilter';
import { IBrand } from '@erxes/ui/src/brands/types';
import Button from '@erxes/ui/src/components/Button';
import CollapsibleList from '@erxes/ui/src/components/collapsibleList/CollapsibleList';
import Icon from '@erxes/ui/src/components/Icon';
import ModalTrigger from '@erxes/ui/src/components/ModalTrigger';
import Tip from '@erxes/ui/src/components/Tip';
import Sidebar from '@erxes/ui/src/layout/components/Sidebar';
import Wrapper from '@erxes/ui/src/layout/components/Wrapper';
import { SidebarList } from '@erxes/ui/src/layout/styles';
import { isEnabled } from '@erxes/ui/src/utils/core';
import { pluginsOfProductCategoryActions } from 'coreui/pluginUtils';
import React from 'react';
import TagFilter from '../../containers/TagFilter';
import { IProductCategory } from '../../types';
import CategoryStatusFilter from '../product/filters/CategoryStatusFilter';
import ProductTypeFilter from '../product/filters/ProdcutTypeFilter';
import SegmentFilter from '../product/filters/SegmentFilter';

const { Section } = Wrapper.Sidebar;

interface IProps {
  history: any;
  queryParams: any;
  remove: (productCategoryId: string) => void;
  productCategories: IProductCategory[];
  productCategoriesCount: number;
  loading: boolean;
  brands: IBrand[];
  brandsLoading: boolean;
}

class List extends React.Component<IProps> {
  renderFormTrigger(trigger: React.ReactNode, category?: IProductCategory) {
    const content = props => (
      <CategoryForm
        {...props}
        category={category}
        categories={this.props.productCategories}
      />
    );

    return (
      <ModalTrigger
        title="Manage category"
        trigger={trigger}
        size="lg"
        content={content}
      />
    );
  }

  isActive = (id: string) => {
    const { queryParams } = this.props;
    const currentGroup = queryParams.categoryId || '';

    return currentGroup === id;
  };

  renderEditAction = (category: IProductCategory) => {
    const trigger = (
      <Button btnStyle="link">
        <Tip text={__('Edit')} placement="bottom">
          <Icon icon="edit" />
        </Tip>
      </Button>
    );

    return this.renderFormTrigger(trigger, category);
  };

  renderRemoveAction = (category: IProductCategory) => {
    const { remove } = this.props;

    return (
      <Button btnStyle="link" onClick={remove.bind(null, category._id)}>
        <Tip text={__('Remove')} placement="bottom">
          <Icon icon="cancel-1" />
        </Tip>
      </Button>
    );
  };

  onClick = (id: string) => {
    const { history } = this.props;

    router.removeParams(history, 'page');
    router.setParams(history, { categoryId: id });
  };

  renderContent() {
    const { productCategories, loading, queryParams } = this.props;

    return (
      <CollapsibleList
        items={productCategories}
        editAction={this.renderEditAction}
        removeAction={this.renderRemoveAction}
        additionalActions={pluginsOfProductCategoryActions}
        loading={loading}
        onClick={this.onClick}
        queryParams={queryParams}
        treeView={true}
        keyCount="productCount"
      />
    );
  }

  renderCategoryHeader() {
    const trigger = (
      <Button btnStyle="success" icon="plus-circle" block={true}>
        Add category
      </Button>
    );

    return <Header>{this.renderFormTrigger(trigger)}</Header>;
  }

  render() {
    return (
      <Sidebar hasBorder={true}>
        {this.renderCategoryHeader()}

        <SidebarList>{this.renderContent()}</SidebarList>

        {isEnabled('segments') && (
          <SegmentFilter loadingMainQuery={this.props.loading} />
        )}
        <CategoryStatusFilter />
        <ProductTypeFilter />
        <BrandFilter
          counts={{}}
          brands={this.props.brands}
          loading={this.props.brandsLoading}
        />
        {isEnabled('tags') && <TagFilter />}
      </Sidebar>
    );
  }
}

export default List;
