/**
 * AddToAny share buttons JSX component with custom buttons.
 * This file overrides the default hexo-component-inferno implementation.
 * 
 * @see https://www.addtoany.com/buttons/
 */
const { Component } = require('inferno');
const { cacheComponent } = require('hexo-component-inferno/lib/util/cache');

/**
 * AddToAny share buttons JSX component.
 */
class AddToAny extends Component {
    render() {
        return <>
            <div class="a2a_kit a2a_kit_size_32 a2a_default_style">
                <a class="a2a_dd" href="https://www.addtoany.com/share"></a>
                <a class="a2a_button_telegram"></a>
                <a class="a2a_button_x"></a>
                <a class="a2a_button_wechat"></a>
                <a class="a2a_button_qzone"></a>
                <a class="a2a_button_sina_weibo"></a>
                </div>
            <script defer src="https://static.addtoany.com/menu/page.js"></script>
        </>;
    }
}

/**
 * Cacheable AddToAny share buttons JSX component.
 */
AddToAny.Cacheable = cacheComponent(AddToAny, 'share.addtoany', props => {
    return {};
});

module.exports = AddToAny;
