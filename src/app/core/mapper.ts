import { classes } from '@automapper/classes';
import { CamelCaseNamingConvention, createMapper } from '@automapper/core';

export default createMapper({
    strategyInitializer: classes(),
    namingConventions: new CamelCaseNamingConvention(),
});
